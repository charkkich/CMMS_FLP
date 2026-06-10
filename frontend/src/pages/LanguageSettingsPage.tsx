import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const LanguageSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    toast.success(`Language changed to ${lang === 'th' ? 'Thai' : 'English'}`);
  };

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('nav.languageSettings')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose your preferred display language</p>
      </div>

      <Card>
        <div className="space-y-3">
          {[
            { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
            { code: 'th', name: 'Thai', native: 'ภาษาไทย', flag: '🇹🇭' },
          ].map((lang) => (
            <div
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                i18n.language === lang.code
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{lang.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lang.native}</p>
                </div>
              </div>
              {i18n.language === lang.code && (
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => toast.success('Settings saved')}>{t('common.save')}</Button>
        </div>
      </Card>
    </div>
  );
};

export default LanguageSettingsPage;
