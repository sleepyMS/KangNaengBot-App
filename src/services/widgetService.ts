/**
 * Widget Service
 * React Native ↔ Android Widget 간의 데이터 변환 및 통신을 담당합니다.
 */
import { NativeModules, Platform } from 'react-native';
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

      rawList.forEach((course: any) => {
        if (!course.slots || course.slots.length === 0) return;

        course.slots.forEach((slot: any) => {
          if (!slot.startTime || !slot.endTime) return;

          const [startH, startM] = slot.startTime.split(':').map(Number);
          const [endH, endM] = slot.endTime.split(':').map(Number);

          // day string to int conversion
          const dayInt =
            typeof slot.day === 'string'
              ? dayMap[slot.day.toLowerCase()]
              : slot.day;

          // Check if dayInt is valid number (0-6)
          if (typeof dayInt !== 'number' || isNaN(dayInt)) return;

          allClasses.push({
            id: course.id,
            title: course.name,
            location: slot.location || course.room || '강의실 미정',
            timeDisplay: `${slot.startTime} - ${slot.endTime}`,
            color: course.color || '#6366f1',
            deepLink: `kangnaeng://class/${course.id}`,
            day: dayInt,
            startTime: startH * 60 + startM,
            endTime: endH * 60 + endM,
          });
        });
      });

      // WidgetData 생성
      const widgetData: WidgetData = {
        updatedAtDisplay: `업데이트: ${now.format('A h:mm')}`,
        formattedDate: now.format('M월 D일 (ddd)'),
        isEmpty: allClasses.length === 0,
        classes: allClasses, // Renamed key to match Kotlin
      };

      console.log(
        '[WidgetService] Updating widget with full data:',
        widgetData,
      );

      // JSON 문자열로 변환하여 전송
      WidgetModule.updateScheduleData(JSON.stringify(widgetData));
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
