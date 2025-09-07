// src/pages/Result.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PolarArea } from 'react-chartjs-2';
import 'chart.js/auto';
import { useTranslation } from 'react-i18next';
import { fromBase64 } from '../utils/string';

declare global {
  interface Window { playConfetti?: () => void; }
}

export default function Result() {
  const { key } = useParams<{ key?: string }>();
  const { t } = useTranslation();
  const [categoryScores, setCategoryScores] = useState<Record<string, number> | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [chartReady, setChartReady] = useState(false);
  const [topCategory, setTopCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;

    let payload: any = null;

    const tryDecode = () => {
      try {
        try {
          const d = fromBase64(key);
          return d;
        } catch (e) { /* fallback below */ }

        try {
          const d = fromBase64(decodeURIComponent(key));
          return d;
        } catch (e) { /* fallback below */ }
        try {
          const d = decodeURIComponent(escape(atob(key)));
          return d;
        } catch (e) { /* last fallback below */ }
        try {
          const d = atob(key);
          return d;
        } catch (e) {
          throw new Error('Unable to decode payload');
        }
      } catch (err) {
        throw err;
      }
    };

    try {
      const decoded = tryDecode();
      payload = JSON.parse(decoded) as {
        name?: string;
        phone?: string;
        grade?: number;
        categoryScores?: Record<string, number>;
      };
    } catch (err) {
      console.error('Failed to decode result payload', err);
      window.location.href = '/';
      return;
    }

    if (!payload || !payload.categoryScores) {
      window.location.href = '/';
      return;
    }

    setCategoryScores(payload.categoryScores);
    setUserName((payload.name || '').replace(/\b(\w)/g, (m: string) => m.toUpperCase()));
    setChartReady(true);

    const entries = Object.entries(payload.categoryScores as Record<string, number>);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]); // b[1], a[1] are numbers
      setTopCategory(entries[0][0]?.toLowerCase() ?? null);
    }
  }, [key]);

  useEffect(() => {
    if (chartReady) {
      try { window.playConfetti?.(); } catch { }
    }
  }, [chartReady]);

  if (!categoryScores) return null;

  const labels = Object.keys(categoryScores).map(k => t(k.toLowerCase()));
  const data = {
    labels,
    datasets: [{
      data: Object.values(categoryScores),
      backgroundColor: Object.values(categoryScores).map(() => `hsla(${Math.floor(Math.random() * 360)},70%,55%,0.8)`)
    }]
  };

  const imageMap: Record<string, string> = {
    'technology': '/images/technology-min.png',
    'tech': '/images/technology-min.png',
    'it': '/images/technology-min.png',
    'art': '/images/art-min.png',
    'nature': '/images/nature-min.png',
    'science': '/images/nature-min.png'
  };

  const getImageForCategory = (cat?: string) => {
    if (!cat) return '/images/aptitude-min.png';
    const keyLower = cat.toLowerCase();
    if (imageMap[keyLower]) return imageMap[keyLower];
    return `/images/${keyLower}-min.png`;
  };

  const imageSrc = getImageForCategory(topCategory ?? undefined);
  const altText = topCategory ? (t(`${topCategory}-alt`) as string) : (t('aptitude') as string);

  return (
    <div className="vw-100 row m-0 p-0">
      <div className="col-sm-10 col-md-8 col-lg-6 mx-auto my-auto text-center">
        <div className="my-5">
          <img src={imageSrc} className="d-block mx-auto img-fluid" alt={altText} width="300" loading="lazy" />
          <h5 className="h5 my-3 opacity-50 text-muted">{t('aptitude')}</h5>
        </div>

        <p className="f-sister display-3 fw-bold text-secondary my-5">{userName}</p>

        {}
        <p className="fs-3"
          dangerouslySetInnerHTML={{ __html: t(`${topCategory ?? Object.keys(categoryScores)[0] ?? ''}-explanation`) as string }}
        />

        {chartReady && <PolarArea data={data} />}
      </div>

      <div className="position-absolute bottom-0 me-10 mb-5">
        <Link className="btn btn-outline-light btn-lg d-flex align-items-center justify-content-center"
          to="/"
          style={{ width: "60px", height: "60px" }}>
          <svg xmlns="http://www.w3.org/2000/svg"
            width="32" height="32"
            fill="currentColor"
            className="bi bi-house-fill"
            viewBox="0 0 16 16">
            <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 
               6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 
               0 0 0-.5.5v1.293z"/>
            <path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 
               1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
