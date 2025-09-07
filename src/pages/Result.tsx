// src/pages/Result.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PolarArea } from 'react-chartjs-2';
import _Chart from 'chart.js/auto';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window { playConfetti?: () => void; }
}

export default function Result() {
  const { key } = useParams();
  const { t } = useTranslation();
  const [categoryScores, setCategoryScores] = useState<Record<string, number> | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (key) {
      try {
        // key is URL-safe base64 encoded payload produced by Test.tsx
        const decoded = decodeURIComponent(atob(key)); // reverse of btoa/encodeURIComponent
        const payload = JSON.parse(decoded) as {
          name?: string;
          phone?: string;
          grade?: number;
          categoryScores?: Record<string, number>;
        };

        if (!payload || !payload.categoryScores) {
          window.location.href = '/';
          return;
        }

        setCategoryScores(payload.categoryScores);
        setUserName((payload.name || '').replace(/\b(\w)/g, m => m.toUpperCase()));
        setChartReady(true);
      } catch (err) {
        console.error('Failed to decode result payload', err);
        window.location.href = '/';
      }
    }
  }, [key]);


  useEffect(() => {
    // play confetti once
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
      // background colors: random selection (Chart.js accepts colors)
      backgroundColor: Object.values(categoryScores).map(() => `hsla(${Math.floor(Math.random() * 360)},70%,55%,0.8)`)
    }]
  };

  return (
    <div className="vw-100 row m-0 p-0">
      <div className="col-sm-10 col-md-8 col-lg-6 mx-auto my-auto text-center">
        <div className="my-5">
          {/* art-min.png */}
          <img src={`/images/art-min.png`} className="d-block mx-auto img-fluid" alt={t('aptitude')} width="300" loading="lazy" />
          <h5 className="h5 my-3 opacity-50 text-muted">{t('aptitude')}</h5>
        </div>
        <p className="f-sister display-3 fw-bold text-secondary my-5">{userName}</p>
        <p className="fs-3" dangerouslySetInnerHTML={{ __html: t(`${Object.keys(categoryScores)[0]?.toLowerCase()}-explanation`) as string }} />

        {chartReady && <PolarArea data={data} />}
      </div>

      <div className="position-absolute bottom-0 end-0 me-5 mb-5">
        <Link className="btn btn-outline-light btn-lg" to="/">
          {/* svg house */}
          Home
        </Link>
      </div>
    </div>
  );
}
