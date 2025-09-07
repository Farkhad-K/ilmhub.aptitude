// src/components/BinaryQuestion.tsx
// import React from 'react';
import { useTranslation } from 'react-i18next';

export type BinaryQuestion = {
  Statement?: string;
  Category?: string;
};

export default function BinaryQuestionComponent({
  question,
  onSelected
}: {
  question?: BinaryQuestion | null;
  onSelected: (result: { yes: boolean; category: string }) => void;
}) {
  const { t } = useTranslation();

  if (!question) return null;

  return (
    <div>
      <h1>{question.Statement}</h1>
      <div className="row gap-3 mt-5">
        <div onClick={() => onSelected({ yes: true, category: question.Category! })}
             className="hover-effect col-sm-4 mx-auto border border-light-subtle card shadow shadow-sm text-norwap">
          <div className="card-body text-center display-3">{t('yes')}</div>
        </div>
        <div onClick={() => onSelected({ yes: false, category: question.Category! })}
             className="hover-effect col-sm-4 mx-auto card border border-light-subtle shadow shadow-sm text-nowrap">
          <div className="card-body text-center display-3">{t('no')}</div>
        </div>
      </div>
    </div>
  );
}
