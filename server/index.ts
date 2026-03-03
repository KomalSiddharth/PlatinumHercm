import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupScheduledTasks } from "./scheduler";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";

const app = express();
app.set("trust proxy", 1);

// CORS - allows Vercel frontend to talk to Railway backend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

// 🔥 MANUAL AUTO-COPY TRIGGER WITH DATE PICKER
app.get('/admin/autocopy-trigger', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manual Auto-Copy</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          max-width: 500px;
          width: 100%;
        }
        h1 { 
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin-bottom: 25px;
          border-radius: 5px;
          font-size: 14px;
          color: #856404;
        }
        .info-box {
          background: #e7f3ff;
          border-left: 4px solid #2196F3;
          padding: 12px;
          margin-bottom: 20px;
          border-radius: 5px;
          font-size: 13px;
          color: #014361;
        }
        label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
          font-size: 14px;
        }
        input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 16px;
          margin-bottom: 20px;
          transition: all 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        button {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
        button:active {
          transform: translateY(0);
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
        #result {
          margin-top: 25px;
          padding: 20px;
          border-radius: 10px;
          display: none;
        }
        .success {
          background: #d4edda;
          border-left: 4px solid #28a745;
          color: #155724;
        }
        .error {
          background: #f8d7da;
          border-left: 4px solid #dc3545;
          color: #721c24;
        }
        .loading {
          background: #d1ecf1;
          border-left: 4px solid #17a2b8;
          color: #0c5460;
        }
        .stat {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .stat:last-child {
          border-bottom: none;
        }
        .stat-label {
          font-weight: 600;
        }
        .stat-value {
          color: #667eea;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔥 Manual Auto-Copy</h1>
        <p class="subtitle">Copy data from a specific date to today for all users</p>
        
        <div class="warning">
          ⚠️ <strong>OVERWRITE MODE</strong><br>
          This will REPLACE today's existing data with data from the selected date. Use carefully!
        </div>
        
        <div class="info-box">
          💡 <strong>Tip:</strong> Leave date blank to automatically copy from the last available date (within 7 days).
        </div>
        
        <label for="sourceDate">📅 Copy From Date (Optional):</label>
        <input type="date" 
               id="sourceDate" 
               placeholder="YYYY-MM-DD (e.g., 2025-12-27)"
               max="${new Date().toISOString().split('T')[0]}">
        
        <label for="adminKey">🔐 Admin Password:</label>
        <input type="password" 
               id="adminKey" 
               placeholder="Enter Admin Password"
               autocomplete="off">
        
        <button onclick="runAutoCopy()" id="runBtn">
          ▶️ RUN AUTO-COPY NOW
        </button>
        
        <div id="result"></div>
      </div>
      
      <script>
        async function runAutoCopy() {
          const adminKey = document.getElementById('adminKey').value;
          const sourceDate = document.getElementById('sourceDate').value;
          const resultDiv = document.getElementById('result');
          const runBtn = document.getElementById('runBtn');
          
          if (!adminKey) {
            resultDiv.className = 'error';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<strong>❌ Error:</strong> Please enter admin password!';
            return;
          }
          
          runBtn.disabled = true;
          runBtn.textContent = '⏳ Processing...';
          resultDiv.className = 'loading';
          resultDiv.style.display = 'block';
          
          const sourceDateText = sourceDate || 'last available date';
          resultDiv.innerHTML = \`<strong>⏳ Running auto-copy from \${sourceDateText}...</strong><br>Please wait, this may take a few seconds...\`;
          
          try {
            const response = await fetch('/admin/run-autocopy-now', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                adminKey,
                sourceDate: sourceDate || null
              })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'success';
              resultDiv.innerHTML = \`
                <strong>✅ SUCCESS! Auto-copy completed!</strong>
                <div style="margin-top: 10px; font-size: 13px;">
                  <strong>Source Date:</strong> \${data.sourceDate || 'auto-detected'}
                </div>
                <div style="margin-top: 15px;">
                  <div class="stat">
                    <span class="stat-label">✅ Users Copied:</span>
                    <span class="stat-value">\${data.stats.copied}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">⏭️ Users Skipped:</span>
                    <span class="stat-value">\${data.stats.skipped}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">❌ Errors:</span>
                    <span class="stat-value">\${data.stats.errors}</span>
                  </div>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px dashed #28a745;">
                  <strong>🎉 All done!</strong> Users can now see today's data in their dashboards.
                </div>
              \`;
              runBtn.textContent = '✅ Completed';
            } else {
              resultDiv.className = 'error';
              resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + (data.error || 'Unknown error occurred');
              runBtn.disabled = false;
              runBtn.textContent = '▶️ TRY AGAIN';
            }
          } catch (error) {
            resultDiv.className = 'error';
            resultDiv.innerHTML = '<strong>❌ Network Error:</strong> ' + error.message;
            runBtn.disabled = false;
            runBtn.textContent = '▶️ TRY AGAIN';
          }
        }
        
        document.getElementById('adminKey').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            runAutoCopy();
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/admin/run-autocopy-now', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    const { adminKey, sourceDate } = req.body;
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Invalid admin password' });
    }

    console.log('[MANUAL AUTO-COPY] Starting manual run...');
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    let targetSourceDate = sourceDate || null;
    
    const allUsers = await storage.getAllUsers();
    let copiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const user of allUsers) {
      try {
        const allWeeks = await storage.getAllHercmWeeksByUserWithDates(user.id);
        
        let sourceData = null;
        let foundSourceDate = '';
        
        if (targetSourceDate) {
          const specificData = allWeeks?.filter((w: any) => w.dateString === targetSourceDate);
          
          if (specificData && specificData.length > 0) {
            sourceData = specificData.sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            foundSourceDate = targetSourceDate;
          } else {
            console.log(`[MANUAL AUTO-COPY] User ${user.email}: No data found for ${targetSourceDate}, skipping`);
            skippedCount++;
            continue;
          }
        } else {
          for (let i = 1; i <= 7; i++) {
            const searchDateTime = new Date(todayStr);
            searchDateTime.setDate(searchDateTime.getDate() - i);
            const searchDate = `${searchDateTime.getFullYear()}-${String(searchDateTime.getMonth() + 1).padStart(2, '0')}-${String(searchDateTime.getDate()).padStart(2, '0')}`;
            
            const previousData = allWeeks?.filter((w: any) => w.dateString === searchDate);
            
            if (previousData && previousData.length > 0) {
              sourceData = previousData.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              foundSourceDate = searchDate;
              break;
            }
          }
        }
        
        if (!sourceData) {
          skippedCount++;
          continue;
        }
        
        console.log(`[MANUAL AUTO-COPY] User ${user.email}: Copying data from ${foundSourceDate} to ${todayStr}`);
        
        const hadAutoSync = (
          sourceData.healthProblems === sourceData.healthResult &&
          sourceData.healthCurrentFeelings === sourceData.healthNextFeelings &&
          sourceData.healthCurrentBelief === sourceData.healthNextTarget &&
          sourceData.healthCurrentActions === sourceData.healthNextActions &&
          sourceData.relationshipProblems === sourceData.relationshipResult &&
          sourceData.relationshipCurrentFeelings === sourceData.relationshipNextFeelings &&
          sourceData.relationshipCurrentBelief === sourceData.relationshipNextTarget &&
          sourceData.relationshipCurrentActions === sourceData.relationshipNextActions &&
          sourceData.careerProblems === sourceData.careerResult &&
          sourceData.careerCurrentFeelings === sourceData.careerNextFeelings &&
          sourceData.careerCurrentBelief === sourceData.careerNextTarget &&
          sourceData.careerCurrentActions === sourceData.careerNextActions &&
          sourceData.moneyProblems === sourceData.moneyResult &&
          sourceData.moneyCurrentFeelings === sourceData.moneyNextFeelings &&
          sourceData.moneyCurrentBelief === sourceData.moneyNextTarget &&
          sourceData.moneyCurrentActions === sourceData.moneyNextActions
        );
        
        const detectedManualMode = !hadAutoSync;
        
        const newWeekData = {
          userId: user.id,
          weekNumber: sourceData.weekNumber,
          year: now.getFullYear(),
          dateString: todayStr,
          currentH: sourceData.currentH,
          currentE: sourceData.currentE,
          currentR: sourceData.currentR,
          currentC: sourceData.currentC,
          targetH: sourceData.targetH,
          targetE: sourceData.targetE,
          targetR: sourceData.targetR,
          targetC: sourceData.targetC,
          healthProblems: sourceData.healthProblems,
          healthCurrentFeelings: sourceData.healthCurrentFeelings,
          healthCurrentBelief: sourceData.healthCurrentBelief,
          healthCurrentActions: sourceData.healthCurrentActions,
          healthResult: sourceData.healthResult,
          healthNextFeelings: sourceData.healthNextFeelings,
          healthNextTarget: sourceData.healthNextTarget,
          healthNextActions: sourceData.healthNextActions,
          healthChecklist: sourceData.healthChecklist,
          healthAssignment: sourceData.healthAssignment,
          healthProblemsChecklist: sourceData.healthProblemsChecklist,
          healthFeelingsCurrentChecklist: sourceData.healthFeelingsCurrentChecklist,
          healthBeliefsCurrentChecklist: sourceData.healthBeliefsCurrentChecklist,
          healthActionsCurrentChecklist: sourceData.healthActionsCurrentChecklist,
          healthResultChecklist: sourceData.healthResultChecklist,
          healthFeelingsChecklist: sourceData.healthFeelingsChecklist,
          healthBeliefsChecklist: sourceData.healthBeliefsChecklist,
          healthActionsChecklist: sourceData.healthActionsChecklist,
          relationshipProblems: sourceData.relationshipProblems,
          relationshipCurrentFeelings: sourceData.relationshipCurrentFeelings,
          relationshipCurrentBelief: sourceData.relationshipCurrentBelief,
          relationshipCurrentActions: sourceData.relationshipCurrentActions,
          relationshipResult: sourceData.relationshipResult,
          relationshipNextFeelings: sourceData.relationshipNextFeelings,
          relationshipNextTarget: sourceData.relationshipNextTarget,
          relationshipNextActions: sourceData.relationshipNextActions,
          relationshipChecklist: sourceData.relationshipChecklist,
          relationshipAssignment: sourceData.relationshipAssignment,
          relationshipProblemsChecklist: sourceData.relationshipProblemsChecklist,
          relationshipFeelingsCurrentChecklist: sourceData.relationshipFeelingsCurrentChecklist,
          relationshipBeliefsCurrentChecklist: sourceData.relationshipBeliefsCurrentChecklist,
          relationshipActionsCurrentChecklist: sourceData.relationshipActionsCurrentChecklist,
          relationshipResultChecklist: sourceData.relationshipResultChecklist,
          relationshipFeelingsChecklist: sourceData.relationshipFeelingsChecklist,
          relationshipBeliefsChecklist: sourceData.relationshipBeliefsChecklist,
          relationshipActionsChecklist: sourceData.relationshipActionsChecklist,
          careerProblems: sourceData.careerProblems,
          careerCurrentFeelings: sourceData.careerCurrentFeelings,
          careerCurrentBelief: sourceData.careerCurrentBelief,
          careerCurrentActions: sourceData.careerCurrentActions,
          careerResult: sourceData.careerResult,
          careerNextFeelings: sourceData.careerNextFeelings,
          careerNextTarget: sourceData.careerNextTarget,
          careerNextActions: sourceData.careerNextActions,
          careerChecklist: sourceData.careerChecklist,
          careerAssignment: sourceData.careerAssignment,
          careerProblemsChecklist: sourceData.careerProblemsChecklist,
          careerFeelingsCurrentChecklist: sourceData.careerFeelingsCurrentChecklist,
          careerBeliefsCurrentChecklist: sourceData.careerBeliefsCurrentChecklist,
          careerActionsCurrentChecklist: sourceData.careerActionsCurrentChecklist,
          careerResultChecklist: sourceData.careerResultChecklist,
          careerFeelingsChecklist: sourceData.careerFeelingsChecklist,
          careerBeliefsChecklist: sourceData.careerBeliefsChecklist,
          careerActionsChecklist: sourceData.careerActionsChecklist,
          moneyProblems: sourceData.moneyProblems,
          moneyCurrentFeelings: sourceData.moneyCurrentFeelings,
          moneyCurrentBelief: sourceData.moneyCurrentBelief,
          moneyCurrentActions: sourceData.moneyCurrentActions,
          moneyResult: sourceData.moneyResult,
          moneyNextFeelings: sourceData.moneyNextFeelings,
          moneyNextTarget: sourceData.moneyNextTarget,
          moneyNextActions: sourceData.moneyNextActions,
          moneyChecklist: sourceData.moneyChecklist,
          moneyAssignment: sourceData.moneyAssignment,
          moneyProblemsChecklist: sourceData.moneyProblemsChecklist,
          moneyFeelingsCurrentChecklist: sourceData.moneyFeelingsCurrentChecklist,
          moneyBeliefsCurrentChecklist: sourceData.moneyBeliefsCurrentChecklist,
          moneyActionsCurrentChecklist: sourceData.moneyActionsCurrentChecklist,
          moneyResultChecklist: sourceData.moneyResultChecklist,
          moneyFeelingsChecklist: sourceData.moneyFeelingsChecklist,
          moneyBeliefsChecklist: sourceData.moneyBeliefsChecklist,
          moneyActionsChecklist: sourceData.moneyActionsChecklist,
          unifiedAssignment: sourceData.unifiedAssignment,
          manualNextWeekMode: detectedManualMode
        };
        
        const existingTodayData = await storage.getHercmWeekByDate(user.id, newWeekData.weekNumber, todayStr);
        if (existingTodayData) {
          await storage.updateHercmWeek(existingTodayData.id, newWeekData);
        } else {
          await storage.createHercmWeek(newWeekData);
        }
        
        try {
          const sourcePlatinumRatings = await storage.getUserPlatinumStandardRatingsByDate(user.id, foundSourceDate);
          
          if (sourcePlatinumRatings && sourcePlatinumRatings.length > 0) {
            for (const rating of sourcePlatinumRatings) {
              await storage.upsertPlatinumStandardRating({
                userId: user.id,
                standardId: rating.standardId,
                dateString: todayStr,
                rating: rating.rating
              });
            }
          }
        } catch (error) {
          console.error('Error copying platinum ratings:', error);
        }
        
        copiedCount++;
        
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Manual auto-copy completed',
      sourceDate: targetSourceDate || 'last available',
      stats: {
        copied: copiedCount,
        skipped: skippedCount,
        errors: errorCount
      }
    });
    
  } catch (error) {
    console.error('[MANUAL AUTO-COPY] Error:', error);
    res.status(500).json({ error: 'Failed to run auto-copy' });
  }
});

(async () => {
  const server = await registerRoutes(app);

  setupScheduledTasks();

  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  }
  // Production mein serveStatic nahi - frontend Vercel pe hai
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => log`serving on port ${port}`
  );
})();
