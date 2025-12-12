// Dummy posture data for one week
// Each day has 8 hours of data (9:00 AM - 5:00 PM), recorded every 5 minutes
// That's 96 readings per day (12 per hour × 8 hours)
// Angle format: ##.# degrees

// Helper to generate realistic posture patterns
const generateDayData = (date, dayType = 'weekday') => {
  const readings = [];
  const baseDate = new Date(date);
  
  // Start at 9:00 AM
  baseDate.setHours(9, 0, 0, 0);
  
  for (let i = 0; i < 96; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 5 * 60 * 1000);
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    
    // Base angle varies by time of day (fatigue pattern)
    let baseAngle;
    if (hour < 11) {
      // Morning: good posture (10-18°)
      baseAngle = 10 + Math.random() * 8;
    } else if (hour < 12) {
      // Late morning: slight decline (12-20°)
      baseAngle = 12 + Math.random() * 8;
    } else if (hour === 12) {
      // Lunch hour: variable (8-22°)
      baseAngle = 8 + Math.random() * 14;
    } else if (hour < 15) {
      // Early afternoon: post-lunch slump (15-28°)
      baseAngle = 15 + Math.random() * 13;
    } else if (hour < 16) {
      // Mid afternoon: worst posture (18-32°)
      baseAngle = 18 + Math.random() * 14;
    } else {
      // Late afternoon: slight recovery (14-26°)
      baseAngle = 14 + Math.random() * 12;
    }
    
    // Weekend tends to be more relaxed (worse posture)
    if (dayType === 'weekend') {
      baseAngle += 3 + Math.random() * 4;
    }
    
    // Add some random spikes (checking phone, slouching)
    if (Math.random() < 0.08) {
      baseAngle += 8 + Math.random() * 10;
    }
    
    // Occasional good posture corrections
    if (Math.random() < 0.05) {
      baseAngle = 5 + Math.random() * 5;
    }
    
    // Clamp and format to ##.#
    const angle = Math.min(45.0, Math.max(2.0, baseAngle));
    
    readings.push({
      timestamp: timestamp.toISOString(),
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      angle: parseFloat(angle.toFixed(1)),
      hour,
      minute,
    });
  }
  
  return readings;
};

// Generate a full week of data (Monday to Sunday)
// Using a recent week as reference
const weekStart = new Date('2024-12-02'); // Monday

export const weeklyDataset = {
  monday: {
    date: '2024-12-02',
    dayName: 'Monday',
    dayType: 'weekday',
    readings: generateDayData('2024-12-02', 'weekday'),
  },
  tuesday: {
    date: '2024-12-03',
    dayName: 'Tuesday',
    dayType: 'weekday',
    readings: generateDayData('2024-12-03', 'weekday'),
  },
  wednesday: {
    date: '2024-12-04',
    dayName: 'Wednesday',
    dayType: 'weekday',
    readings: generateDayData('2024-12-04', 'weekday'),
  },
  thursday: {
    date: '2024-12-05',
    dayName: 'Thursday',
    dayType: 'weekday',
    readings: generateDayData('2024-12-05', 'weekday'),
  },
  friday: {
    date: '2024-12-06',
    dayName: 'Friday',
    dayType: 'weekday',
    readings: generateDayData('2024-12-06', 'weekday'),
  },
  saturday: {
    date: '2024-12-07',
    dayName: 'Saturday',
    dayType: 'weekend',
    readings: generateDayData('2024-12-07', 'weekend'),
  },
  sunday: {
    date: '2024-12-08',
    dayName: 'Sunday',
    dayType: 'weekend',
    readings: generateDayData('2024-12-08', 'weekend'),
  },
};

// Get all days as an array for easy iteration
export const allDays = Object.values(weeklyDataset);

// Calculate daily summary stats
export const getDailySummary = (dayData) => {
  const angles = dayData.readings.map(r => r.angle);
  const avg = angles.reduce((a, b) => a + b, 0) / angles.length;
  const max = Math.max(...angles);
  const min = Math.min(...angles);
  
  return {
    date: dayData.date,
    dayName: dayData.dayName,
    avgAngle: parseFloat(avg.toFixed(1)),
    maxAngle: parseFloat(max.toFixed(1)),
    minAngle: parseFloat(min.toFixed(1)),
    totalReadings: angles.length,
  };
};

// Get weekly summary
export const getWeeklySummary = () => {
  return allDays.map(day => {
    const summary = getDailySummary(day);
    const threshold = 25; // default threshold
    const goodReadings = day.readings.filter(r => r.angle <= threshold).length;
    const alertCount = day.readings.filter(r => r.angle > threshold).length;
    
    return {
      ...summary,
      goodPosturePercent: parseFloat(((goodReadings / day.readings.length) * 100).toFixed(1)),
      alertCount,
    };
  });
};

// Get hourly averages for a specific day (for chart aggregation)
export const getHourlyAverages = (dayData) => {
  const hourlyData = {};
  
  dayData.readings.forEach(reading => {
    const hour = reading.hour;
    if (!hourlyData[hour]) {
      hourlyData[hour] = [];
    }
    hourlyData[hour].push(reading.angle);
  });
  
  return Object.entries(hourlyData).map(([hour, angles]) => ({
    time: `${hour}:00`,
    hour: parseInt(hour),
    avgAngle: parseFloat((angles.reduce((a, b) => a + b, 0) / angles.length).toFixed(1)),
    maxAngle: parseFloat(Math.max(...angles).toFixed(1)),
    minAngle: parseFloat(Math.min(...angles).toFixed(1)),
    readings: angles.length,
  }));
};

// Export raw data as well for direct access
export default weeklyDataset;
