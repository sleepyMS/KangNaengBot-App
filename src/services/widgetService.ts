/**
 * Widget Service
 * React Native ↔ Android Widget 간의 데이터 변환 및 통신을 담당합니다.
 */
import { NativeModules, Platform, Appearance } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

// 한국어 로케일 설정
dayjs.locale('ko');

const { WidgetModule } = NativeModules;

// FE에서 넘어오는 시간표 데이터 타입 (추정)
interface ClassItem {
  id: string;
  name: string;
  room?: string;
  day: number; // 0: 일, 1: 월 ...
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  color?: string;
}

interface ScheduleData {
  classes?: ClassItem[];
  courses?: ClassItem[]; // Payload from bridge might use 'courses'
  updatedAt?: number;
}

interface WidgetData {
  updatedAtDisplay: string;
  formattedDate: string;
  classes: WidgetClassItem[]; // Renamed from todayClasses
  isEmpty: boolean;
  theme: string; // 'light' | 'dark'
}

interface WidgetClassItem {
  id: string;
  title: string;
  location: string;
  timeDisplay: string;
  color: string;
  deepLink: string;
  day: number;
  startTime: number;
  endTime: number;
  colIndex: number;
  maxCols: number;
}

export const widgetService = {
  /**
   * 시간표 데이터를 위젯용 포맷으로 변환하여 네이티브로 전송
   */
  updateWidget: async (scheduleData: ScheduleData) => {
    if (Platform.OS !== 'android') return;

    try {
      const now = dayjs();
      const dayOfWeek = now.day(); // 0(일) ~ 6(토)

      // 전체 수업 데이터 매핑 (slots 배열 펼치기)
      const rawList = scheduleData.courses || scheduleData.classes || [];
      const allClasses: WidgetClassItem[] = [];

      const dayMap: { [key: string]: number } = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      };

      // 1. Flatten to intermediate structure
      // We will perform overlap calculation per day.
      const rawSlotsByDay: { [key: number]: WidgetClassItem[] } = {};
      for (let i = 0; i <= 6; i++) {
        rawSlotsByDay[i] = [];
      }

      rawList.forEach((course: any) => {
        // Validation 1: Check slots array
        if (
          !course.slots ||
          !Array.isArray(course.slots) ||
          course.slots.length === 0
        )
          return;

        course.slots.forEach((slot: any) => {
          // Validation 2: Check required fields
          if (!slot.startTime || !slot.endTime) return;

          // Validation 3: Check Time Format (HH:mm)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (
            !timeRegex.test(slot.startTime) ||
            !timeRegex.test(slot.endTime)
          ) {
            console.warn(
              `[WidgetService] Invalid time format: ${slot.startTime} ~ ${slot.endTime}`,
            );
            return;
          }

          const [startH, startM] = slot.startTime.split(':').map(Number);
          const [endH, endM] = slot.endTime.split(':').map(Number);

          // Validation 4: Check Day
          let dayInt = -1;
          if (typeof slot.day === 'string') {
            const lowerDay = slot.day.toLowerCase();
            if (dayMap.hasOwnProperty(lowerDay)) {
              dayInt = dayMap[lowerDay];
            }
          } else if (typeof slot.day === 'number') {
            dayInt = slot.day;
          }

          if (dayInt < 0 || dayInt > 6 || isNaN(dayInt)) {
            console.warn(`[WidgetService] Invalid day: ${slot.day}`);
            return;
          }

          const startTotal = startH * 60 + startM;
          const endTotal = endH * 60 + endM;

          if (startTotal >= endTotal) {
            console.warn(
              `[WidgetService] Start time must be before end time: ${slot.startTime} >= ${slot.endTime}`,
            );
            return;
          }

          // Validation 5: Color Hex
          let color = course.color || '#6366f1';
          if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
            color = '#6366f1'; // Fallback
          }

          rawSlotsByDay[dayInt].push({
            id: course.id,
            title: course.name || '수업',
            location: slot.location || course.room || '강의실 미정',
            timeDisplay: `${slot.startTime} - ${slot.endTime}`,
            color: color,
            deepLink: `kangnaeng://class/${course.id}`,
            day: dayInt,
            startTime: startTotal,
            endTime: endTotal,
            colIndex: 0,
            maxCols: 1,
          });
        });
      });

      // 2. Algorithm to assign columns (Ported from FE)
      for (let d = 0; d <= 6; d++) {
        const slots = rawSlotsByDay[d];
        if (slots.length === 0) continue;

        // Sort by start time
        slots.sort((a, b) => a.startTime - b.startTime);

        const activeSlots: { item: WidgetClassItem; columnIndex: number }[] =
          [];

        slots.forEach(item => {
          // Filter out slots that have ended
          // item starts >= active.end -> no overlap
          const stillActive = activeSlots.filter(
            active => active.item.endTime > item.startTime,
          );

          // Find lowest available column index
          const usedColumns = new Set(stillActive.map(s => s.columnIndex));
          let columnIndex = 0;
          while (usedColumns.has(columnIndex)) {
            columnIndex++;
          }

          item.colIndex = columnIndex;

          // Re-populate activeSlots
          activeSlots.length = 0;
          activeSlots.push(...stillActive);
          activeSlots.push({ item, columnIndex });

          // Second Pass: Calculate maxCols for each overlapping cluster
          // Determine the total number of columns needed for a visual row by checking overlapping neighbors.
          // For a given item, maxCols = max(colIndex of any overlapping item) + 1.
        }); // Close forEach

        for (let i = 0; i < slots.length; i++) {
          const current = slots[i];
          let maxColIndex = current.colIndex;

          // Check all others for overlap
          for (let j = 0; j < slots.length; j++) {
            if (i === j) continue;
            const other = slots[j];

            // Overlap condition
            if (
              current.startTime < other.endTime &&
              other.startTime < current.endTime
            ) {
              if (other.colIndex > maxColIndex) {
                maxColIndex = other.colIndex;
              }
            }
          }
          current.maxCols = maxColIndex + 1;
        }

        // Push processed items to main list
        allClasses.push(...slots);
      }

      // WidgetData 생성
      const currentTheme = Appearance.getColorScheme() || 'light';

      const widgetData: WidgetData = {
        updatedAtDisplay: `업데이트: ${now.format('A h:mm')}`,
        formattedDate: now.format('M월 D일 (ddd)'),
        isEmpty: allClasses.length === 0,
        classes: allClasses, // Renamed key to match Kotlin
        theme: currentTheme,
      };

      console.log(
        '[WidgetService] Updating widget with full data:',
        widgetData,
      );

      // JSON 문자열로 변환하여 전송
      WidgetModule.updateScheduleData(JSON.stringify(widgetData));

      // 알림 시스템에도 데이터 변경 알림 (즉시 동기화)
      const { notificationService } = require('./notificationService');
      notificationService.refreshNotifications();
    } catch (error) {
      console.error('[WidgetService] Failed to update widget:', error);
    }
  },

  /**
   * 위젯 데이터 삭제 (로그아웃 시)
   */
  clearWidget: () => {
    if (Platform.OS !== 'android') return;
    WidgetModule.deleteScheduleData();
  },
};
