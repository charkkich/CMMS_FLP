import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';

const mockEvents = [
  { date: '2024-12-05', title: 'Monthly Pump Inspection', pmCode: 'PM-001', color: 'blue' },
  { date: '2024-12-10', title: 'Quarterly Generator Service', pmCode: 'PM-002', color: 'red' },
  { date: '2024-12-20', title: 'Weekly Safety Check', pmCode: 'PM-005', color: 'green' },
  { date: '2024-12-22', title: 'Air Filter Replacement', pmCode: 'PM-003', color: 'blue' },
  { date: '2024-12-28', title: 'Irrigation System Flush', pmCode: 'PM-004', color: 'purple' },
];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const PmCalendarPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Pad start to align with day of week (0=Sun)
  const startPad = getDay(startOfMonth(currentMonth));
  const paddedDays = [...Array(startPad).fill(null), ...days];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('pm.calendar')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">PM Calendar View</p>
      </div>

      <Card>
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return <div key={`pad-${idx}`} className="min-h-[80px]" />;
            }

            const dayStr = format(day, 'yyyy-MM-dd');
            const events = mockEvents.filter((e) => e.date === dayStr);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dayStr}
                className={`min-h-[80px] p-1 rounded-lg border transition-colors ${
                  isToday
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-primary-600 text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {events.map((event, i) => (
                    <div
                      key={i}
                      className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${colorMap[event.color] || colorMap.blue}`}
                      title={event.title}
                    >
                      {event.pmCode}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Scheduled PM Tasks this month:</p>
          <div className="space-y-1">
            {mockEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-sm ${colorMap[event.color]?.split(' ')[0]}`} />
                <span className="text-gray-500 dark:text-gray-400 text-xs">{event.date}</span>
                <span className="font-medium text-xs text-gray-700 dark:text-gray-300">[{event.pmCode}]</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{event.title}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PmCalendarPage;
