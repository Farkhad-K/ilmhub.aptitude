// src/pages/Result.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fromBase64, toBase64 } from '../utils/string';
import { PolarArea } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
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
      const userKey = fromBase64(decodeURIComponent(key));
      const resultsRaw = localStorage.getItem('aptitude.results');
      const all = resultsRaw ? JSON.parse(resultsRaw) as Record<string, Record<string, number>> : {};
      const cs = all[userKey];
      if (!cs) {
        // redirect to home if no results
        window.location.href = '/';
        return;
      }
      setCategoryScores(cs);

      const name = userKey.split(':')[0] || '';
      // capital case using helper? quick inline:
      setUserName(name.replace(/\b(\w)/g, m => m.toUpperCase()));

      setChartReady(true);
    }
  }, [key]);

  useEffect(() => {
    // play confetti once
    if (chartReady) {
      try { window.playConfetti?.(); } catch {}
    }
  }, [chartReady]);

  if (!categoryScores) return null;

  const labels = Object.keys(categoryScores).map(k => t(k.toLowerCase()));
  const data = {
    labels,
    datasets: [{
      data: Object.values(categoryScores),
      // background colors: random selection (Chart.js accepts colors)
      backgroundColor: Object.values(categoryScores).map(() => `hsla(${Math.floor(Math.random()*360)},70%,55%,0.8)`)
    }]
  };

  return (
    <div className="vw-100 row m-0 p-0">
      <div className="col-sm-10 col-md-8 col-lg-6 mx-auto my-auto text-center">
        <div className="my-5">
          {/* art-min.png */}
          <img src={`/images/aptitude-min.png`} className="d-block mx-auto img-fluid" alt={t('aptitude')} width="300" loading="lazy" />
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
