import React from 'react'
import ReactDOM from 'react-dom/client'
import PostureTracker from './PostureTracker'
import HistoryHub from './HistoryHub'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostureTracker />,
    <HistoryHub />
  </React.StrictMode>,
)
