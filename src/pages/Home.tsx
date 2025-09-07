// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function Home() {
  const { t } = useTranslation();
  // For culture dropdown, we will read available locales from i18n config
  const [culture, setCulture] = React.useState<string>(localStorage.getItem('blazor.culture') ?? 'uz-Latn');

  const setCultureAndReload = (c: string) => {
    localStorage.setItem('blazor.culture', c);
    // simple reload to pick up new locale
    location.reload();
  };

  return (
    <div className="container py-5">
      <div className="row flex-lg-row-reverse align-items-center g-5 py-5">
        <div className="col-10 col-sm-8 col-lg-6 mx-auto">
          <img src="/images/hero-1-min.png" className="d-block mx-lg-auto img-fluid" alt="logo" width="700" height="500" loading="lazy" />
        </div>
        <div className="col-lg-6">
          <div dangerouslySetInnerHTML={{ __html: t('home-banner-title') as string }} />
          <div dangerouslySetInnerHTML={{ __html: t('home-banner-subtitle') as string }} />

          <div className="d-grid gap-2 d-md-flex justify-content-md-start mt-5">
            <Link to="/test" className="btn btn-outline-primary px-4 me-md-2 fs-4 text-decoration-none f-sister">
              {t('start-button')}
              {/* svg omitted for brevity */}
            </Link>
          </div>
        </div>
      </div>

      {/* features and modal (copy markup from Blazor index) */}
      {/* For brevity, rest of the markup is similar to your original index.html - you can paste the feature blocks and modal here */}
    </div>
  );
}
