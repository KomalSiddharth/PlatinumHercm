# 🚀 Google Sheets Instant Sync Setup Guide

This guide will help you set up **instant real-time synchronization** between your Google Sheet and the HRCM Dashboard. Whenever you edit the sheet, all users will see the changes **immediately** without waiting for polling!

## How It Works

1. **Google Apps Script** triggers whenever you edit the sheet
2. **Webhook** calls your backend server instantly
3. **WebSocket broadcast** notifies all connected clients
4. **Frontend auto-refreshes** course data with a toast notification

## Setup Instructions

### Step 1: Open Your Google Sheet
1. Go to: https://docs.google.com/spreadsheets/d/1WItwo6f0TJ9EhHYtiTt_9mlBbQGHE5nBpgiKChUOq_c/edit
2. Click on **Extensions** → **Apps Script**

### Step 2: Add the Apps Script Code
1. Delete any existing code in the editor
2. Paste the following code:

```javascript
/**
 * HRCM Dashboard - Instant Google Sheets Sync
 * 
 * This script sends a webhook notification to your backend whenever
 * the sheet is edited, enabling instant real-time updates.
 */

// 🔧 CONFIGURATION - Update this with your Replit app URL
const WEBHOOK_URL = 'https://your-replit-app-url.replit.dev/api/webhooks/google-sheets-update';

/**
 * Triggered automatically when any cell in the sheet is edited
 */
function onEdit(e) {
  try {
    // Get information about the edit
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const editedRow = range.getRow();
    const editedColumn = range.getColumn();
    const newValue = range.getValue();
    const oldValue = e.oldValue;
    
    console.log('📝 Sheet edited:', {
      sheetName: sheet.getName(),
      row: editedRow,
      column: editedColumn,
      oldValue: oldValue,
      newValue: newValue
    });
    
    // Send webhook notification to backend
    sendWebhookNotification({
      type: 'sheet_edited',
      sheetName: sheet.getName(),
      editedRow: editedRow,
      editedColumn: editedColumn,
      oldValue: oldValue,
      newValue: newValue,
      timestamp: new Date().toISOString(),
      editor: Session.getActiveUser().getEmail()
    });
    
    console.log('✅ Webhook sent successfully');
  } catch (error) {
    console.error('❌ Error in onEdit trigger:', error);
  }
}

/**
 * Send HTTP POST request to webhook endpoint
 */
function sendWebhookNotification(data) {
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      console.log('✅ Webhook response:', response.getContentText());
    } else {
      console.error('⚠️ Webhook returned non-200 status:', statusCode);
    }
  } catch (error) {
    console.error('❌ Failed to send webhook:', error);
    // Don't throw - we don't want to block the sheet edit
  }
}

/**
 * Test function to manually trigger the webhook
 * Run this once to verify everything is working
 */
function testWebhook() {
  sendWebhookNotification({
    type: 'test',
    message: 'Test notification from Google Sheets',
    timestamp: new Date().toISOString()
  });
  
  console.log('🧪 Test webhook sent! Check your backend logs.');
}
```

### Step 3: Update the Webhook URL
1. In the Apps Script editor, find this line:
   ```javascript
   const WEBHOOK_URL = 'https://your-replit-app-url.replit.dev/api/webhooks/google-sheets-update';
   ```
2. Replace `your-replit-app-url.replit.dev` with your actual Replit app URL
3. Example: `https://platinum-hrcm-dashboard.replit.dev/api/webhooks/google-sheets-update`

### Step 4: Save and Deploy
1. Click **Save** (💾 icon)
2. Name your project: "HRCM Dashboard Webhook"

### Step 5: Set Up the Trigger
1. Click on the **Triggers** icon (⏰ alarm clock icon) in the left sidebar
2. Click **+ Add Trigger** (bottom right)
3. Configure the trigger:
   - **Choose which function to run**: `onEdit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From spreadsheet`
   - **Select event type**: `On edit`
4. Click **Save**
5. You may need to **authorize** the script - click "Review Permissions"
6. Select your Google account
7. Click **Advanced** → **Go to [Project Name] (unsafe)**
8. Click **Allow**

### Step 6: Test the Setup
1. In the Apps Script editor, select `testWebhook` from the function dropdown (top)
2. Click **Run** (▶️ play icon)
3. Check your backend logs - you should see:
   ```
   [WEBHOOK] 📢 Google Sheets update notification received
   [WEBHOOK] ✅ Broadcast sent to all WebSocket clients
   ```

### Step 7: Test Live Updates
1. Open your HRCM Dashboard in browser
2. Go to Course Tracker page
3. Edit any cell in your Google Sheet
4. **Within 1-2 seconds**, you should see:
   - Toast notification: "📢 Courses Updated - Google Sheets data synced instantly!"
   - Course data automatically refreshes

## How to Verify It's Working

### Backend Logs
When you edit the sheet, you should see:
```
[WEBHOOK] 📢 Google Sheets update notification received
[WEBHOOK] Request body: { "type": "sheet_edited", ... }
[WEBHOOK] ✅ Broadcast sent to all WebSocket clients
```

### Frontend Console
When the update is received, you should see:
```
[LifeSkillsMap] 📢 Received course data change notification from Google Sheets webhook
[LifeSkillsMap] 🔄 Instantly refetching course data...
```

## Troubleshooting

### Issue: Webhook not triggering
- **Check URL**: Make sure WEBHOOK_URL is correct in Apps Script
- **Check Trigger**: Verify the trigger is set up correctly (Step 5)
- **Check Permissions**: Ensure you authorized the script

### Issue: 401 Unauthorized or 500 Error
- **Check Backend**: Make sure your Replit app is running
- **Check Endpoint**: Verify `/api/webhooks/google-sheets-update` endpoint exists
- **Check Logs**: Look at Apps Script logs (View → Logs)

### Issue: Updates not instant
- **Check WebSocket**: Make sure WebSocket connection is active
- **Check Browser Console**: Look for WebSocket messages
- **Fallback**: 30-second polling is still active as backup

## Benefits

✅ **Instant Updates**: Changes appear in 1-2 seconds instead of 30 seconds  
✅ **Multiple Users**: All users see updates simultaneously  
✅ **Toast Notifications**: Visual confirmation when data syncs  
✅ **Automatic Fallback**: Polling continues if webhook fails  
✅ **Zero Manual Work**: Edit sheet → Everyone sees it instantly  

## Technical Details

- **Webhook Endpoint**: `/api/webhooks/google-sheets-update`
- **WebSocket Message**: `{ type: 'course_data_changed', timestamp: '...' }`
- **Fallback Polling**: 30 seconds (continues even when webhook works)
- **Security**: Webhook endpoint is public but only triggers a broadcast

---

**Setup Complete!** 🎉  
Now whenever you edit the Google Sheet, all users will see the changes instantly!
