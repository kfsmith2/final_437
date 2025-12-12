import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// PASTE YOUR KEYS HERE
const supabase = createClient('https://bimcpzzlibrwyhiushsw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbWNwenpsaWJyd3loaXVzaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTAzODksImV4cCI6MjA4MTA2NjM4OX0.YbcWsEDOD08MW_L_O-rHdqknXMfN_TYvoOC5L6nd32w');

export default function HistoryHub() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    // Get last 100 records
    const { data, error } = await supabase
      .from('posture_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      // Reverse so the chart goes Left -> Right
      const formatted = data.reverse().map(item => ({
        time: new Date(item.created_at).toLocaleTimeString(),
        pitch: item.pitch,
        slouching: item.is_slouching
      }));
      setHistory(formatted);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '10px', marginTop: '20px' }}>
      <h2>📊 Posture Trends (Last Session)</h2>
      <button onClick={fetchHistory}>Refresh Data</button>
     
      {loading ? <p>Loading cloud data...</p> : (
        <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pitch" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
