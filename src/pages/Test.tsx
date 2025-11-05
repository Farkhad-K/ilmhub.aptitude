import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BinaryQuestionComponent from '../components/BinaryQuestion';
import type { BinaryQuestion } from '../components/BinaryQuestion';
import { shuffle } from '../utils/collection';
import { slugify } from '../utils/string';
import { useTranslation } from 'react-i18next';
import { telegram } from '../services/telegram';
import { sendAttemptToTelegram } from '../services/telegramBotService';

export default function Test() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<BinaryQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('');
  const [isTelegram, setIsTelegram] = useState(false);
  const [filial, setFilial] = useState<string>('');
  const [filialLabel, setFilialLabel] = useState<string>('');

  // 🔤 Localized filial list
  const filialOptions = useMemo(() => [
    { value: 'namangan-uychi', label: t('filials.namangan-uychi'), short: 'Namangan — Uychi' },
    { value: 'namangan-shahar', label: t('filials.namangan-shahar'), short: 'Namangan — Shahar' },
    { value: 'chimgan', label: t('filials.chimgan'), short: 'Chimgan' },
    { value: 'feruza', label: t('filials.feruza'), short: 'Feruza' },
    { value: 'yunusobod', label: t('filials.yunusobod'), short: 'Yunusobod' }
  ], [t]);

  useEffect(() => {
    (async () => {
      const isMini = await telegram.isMiniApp();
      setIsTelegram(isMini);
      if (isMini) {
        const u = await telegram.getUser() as any;
        setName(u?.first_name ?? u?.last_name ?? u?.username ?? '');
      }
    })();

    const culture = localStorage.getItem('blazor.culture') ?? i18n.language ?? 'uz-Latn';
    const file = `/data/test-new.${culture}.json`;

    fetch(file)
      .then(r => r.json())
      .then((rawData: any[]) => {
        const data = (rawData || []).map(item => ({
          Statement: item.Statement ?? item.statement ?? '',
          Category: item.Category ?? item.category ?? ''
        })) as BinaryQuestion[];

        const shuffled = shuffle(data) || [];
        setQuestions(shuffled);

        const cats: Record<string, number> = {};
        shuffled.forEach(q => {
          if (q.Category) cats[q.Category] = 0;
        });
        setCategoryScores(cats);
      })
      .catch(err => console.error('Loading test failed', err));
  }, [i18n.language]);

  const currentQuestion = questions[index];
  const progress = questions.length ? Math.round((index / questions.length) * 100) : 0;

  const validatePhone = (p: string) => /^\d{2}\d{7}$/.test(p);
  const isNameValid = name.length >= 3;
  const isGradeValid = (() => {
    const n = parseInt(grade || '0', 10);
    return n > 0 && n < 12;
  })();

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((isTelegram || (isNameValid && validatePhone(phone) && isGradeValid)) && filial) {
      const timestamp = Math.floor(Date.now() / 1000);
      const storageKey = `${slugify(name)}:${phone}:${grade}:${filial}:${timestamp}`;
      sessionStorage.setItem('user', storageKey);
      setStarted(true);
      await telegram.expand();
    }
  };

  const handleSelected = async (result: { yes: boolean; category: string }) => {
    setCategoryScores(prev => {
      const copy = { ...prev };
      copy[result.category] = (copy[result.category] || 0) + (result.yes ? 1 : 0);
      return copy;
    });

    const nextIndex = index + 1;
    setIndex(nextIndex);

    if (nextIndex === questions.length) {
      const finalScores = { ...categoryScores };

      const attemptData = {
        storageKey: sessionStorage.getItem('user') ?? undefined,
        name,
        phone,
        grade: parseInt(grade || '0', 10),
        filial: filialLabel || undefined,
        categoryScores: finalScores
      };

      sendAttemptToTelegram(attemptData).catch(e => console.warn('telegram forward failed', e));

      const payload = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(attemptData)))));
      navigate(`/result/${payload}`);
    }
  };

  const onFilialChange = (val: string) => {
    setFilial(val);
    const opt = filialOptions.find(f => f.value === val);
    setFilialLabel(opt ? opt.short : '');
  };

  return (
    <div>
      {started ? (
        <>
          <div className="progress position-absolute bottom-0 vw-100">
            <div className="progress-bar" style={{ width: `${progress}%` }}>{progress}%</div>
          </div>
          {currentQuestion && (
            <div className="content vh-100 vw-100 row m-0">
              <div className="col-md-10 col-lg-8 col-xxlg-6 mx-auto my-auto">
                <div className="mx-3">
                  <BinaryQuestionComponent question={currentQuestion} onSelected={(r) => handleSelected(r as any)} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="modal d-block modal-sheet bg-transparent p-4 py-md-5" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content rounded-4 shadow">
              <div className="modal-header p-5 pb-4 border-bottom-0">
                <h1 className="fw-bold mb-0 fs-2">{t('modal.title')}</h1>
              </div>
              <div className="modal-body p-5 pt-0">
                <form onSubmit={start}>
                  <div className="form-floating mb-3">
                    <input value={name} onChange={e => setName(e.target.value)} type="text" className="form-control rounded-3" id="name-input" placeholder={t('modal.name-placeholder') as string} />
                    <label className="opacity-50" htmlFor="name-input">{t('modal.name-placeholder')}</label>
                    {!isNameValid && <div className="invalid-feedback d-block"><small className="opacity-50 text-warning-emphasis">{t('modal.name-warning')}</small></div>}
                  </div>

                  <div className="input-group mb-3 has-validation">
                    <span className="input-group-text">+998</span>
                    <div className="form-floating">
                      <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="form-control" id="phone-input" placeholder={t('modal.phone-placeholder') as string} />
                      <label className="opacity-50" htmlFor="phone-input">{t('modal.phone-placeholder')}</label>
                    </div>
                    {!validatePhone(phone) && <div className="invalid-feedback d-block"><small className="opacity-50 text-warning-emphasis">{t('modal.phone-warning')}</small></div>}
                  </div>

                  <div className="form-floating mb-3">
                    <input value={grade} onChange={e => setGrade(e.target.value)} type="number" className="form-control rounded-3" id="grade-input" placeholder={t('modal.grade-placeholder') as string} min={1} max={11} />
                    <label className="opacity-50" htmlFor="grade-input">{t('modal.grade-placeholder')}</label>
                    {!isGradeValid && <div className="invalid-feedback d-block"><small className="opacity-50 text-warning-emphasis">{t('modal.grade-warning')}</small></div>}
                  </div>

                  {/* Filial dropdown */}
                  <div className="form-floating mb-3">
                    <select
                      id="filial-select"
                      className="form-select text-secondary fw-normal"
                      value={filial}
                      onChange={e => onFilialChange(e.target.value)}
                      required
                    >
                      <option value="" hidden />
                      {filialOptions.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <label htmlFor="filial-select" className="opacity-50 fs-6">{t('modal.select-filial')}</label>
                    {!filial && <div className="invalid-feedback d-block"><small className="opacity-50 text-warning-emphasis">{t('modal.select-filial-warning') ?? 'Please choose filial'}</small></div>}
                  </div>

                  <button type="submit" className="w-100 mb-2 btn btn-lg rounded-3 btn-primary"
                    disabled={!validatePhone(phone) || (!isTelegram && !isNameValid) || !filial}>
                    {t('modal.submit-button')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
