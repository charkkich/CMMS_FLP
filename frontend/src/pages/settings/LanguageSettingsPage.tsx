import React from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Card from '../../components/ui/Card';

const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    preview: {
      dashboard: 'Dashboard',
      requests: 'Maintenance Requests',
      assets: 'Assets',
      save: 'Save',
    },
  },
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ภาษาไทย',
    flag: '🇹🇭',
    preview: {
      dashboard: 'แดชบอร์ด',
      requests: 'คำขอซ่อมบำรุง',
      assets: 'ทรัพย์สิน',
      save: 'บันทึก',
    },
  },
];

const LanguageSettingsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    toast.success(`Language changed to ${LANGUAGES.find(l => l.code === code)?.name}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Language Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose your preferred display language</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LANGUAGES.map(lang => {
          const isSelected = currentLang === lang.code || (currentLang.startsWith(lang.code));
          return (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                </div>
              )}
              <div className="text-3xl mb-3">{lang.flag}</div>
              <div className="mb-1">
                <span className="text-base font-semibold text-gray-900 dark:text-white">{lang.nativeName}</span>
                {lang.nativeName !== lang.name && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({lang.name})</span>
                )}
              </div>

              {/* Preview */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase font-medium">Preview</p>
                <div className="space-y-1">
                  {Object.entries(lang.preview).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 capitalize w-16">{key}:</span>
                      <span className={`font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-lg">
            {LANGUAGES.find(l => l.code === currentLang || currentLang.startsWith(l.code))?.flag || '🌐'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Currently using: <span className="text-primary-600 dark:text-primary-400">
                {LANGUAGES.find(l => l.code === currentLang || currentLang.startsWith(l.code))?.nativeName || currentLang}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Language preference is saved to your browser
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LanguageSettingsPage;
