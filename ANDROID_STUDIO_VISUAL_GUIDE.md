# 🎯 Android Studio Visual Guide - Step by Step

## 📂 Step 1: Open Project

### Method A: From Welcome Screen
```
Android Studio Welcome Screen
├── Open
├── New Project  
├── Get from VCS
└── └── Open → Navigate to: c:\Users\POZEH\Documents\Shoping-website-main\Shoping-website-main\app\android
```

### Method B: From Already Open Studio
```
Menu Bar → File → Open
└── Navigate to: c:\Users\POZEH\Documents\Shoping-website-main\Shoping-website-main\app\android
```

**Keyboard Shortcut:** `Ctrl+Shift+O` (Open Project)

---

## 🔨 Step 2: Build Commands

### Clean Project
```
Menu Bar Path:
Build → Clean Project
```
**Keyboard Shortcut:** `Ctrl+Shift+Del` then choose Clean

### Rebuild Project  
```
Menu Bar Path:
Build → Rebuild Project
```
**Keyboard Shortcut:** `Ctrl+Shift+F9`

### Build APK
```
Menu Bar Path:
Build → Build Bundle(s) / APK(s) → Build APK(s)
```
**No keyboard shortcut - must use menu**

---

## ▶️ Step 3: Run the App

### Primary Method - Green Play Button
```
Toolbar:
[🔍] [▶ Run] [🐞 Debug] [⚙️ AVD Manager]
     ↑
   Click this
```

### Menu Method
```
Menu Bar Path:
Run → Run 'app'
```
**Keyboard Shortcut:** `Shift+F10`

---

## 📱 Step 4: Select Device/Emulator

### Device Selection Dropdown
```
Toolbar (above Run button):
[Connected Device Name ▼] [▶ Run]
                        ↑
                Click to change device
```

### Available Options:
- **Your Phone** (if connected via USB)
- **Pixel 6 API 33** (emulator)
- **Create Device** (to make new emulator)

---

## 🔍 Step 5: Verify Desktop View

### What to Check in the Running App:

#### ✅ Success Indicators:
```
App Screen Should Show:
├── Full desktop layout (1200px width)
├── EcoLoop Kenya header with ocean effects
├── Hero sections at desktop size
├── Navigation menu with all items
├── NyumbaSure dashboard (if accessed)
├── Smooth animations and transitions
├── Vertical scrolling only
└── No horizontal scrollbars
```

#### ❌ Problem Indicators:
```
If you see these, something's wrong:
├── Mobile layout (narrow, stacked elements)
├── Zoom controls appearing
├── Horizontal scrollbars
├── Broken animations
├── Missing navigation items
└── Layout switching when rotating
```

---

## 🛠 Troubleshooting Quick Fixes

### Gradle Issues:
```
Bottom Status Bar → "Gradle Sync Failed"
├── Click "Try Again"
├── Or: File → Sync Project with Gradle Files
└── Or: File → Invalidate Caches / Restart
```

### Build Errors:
```
Build Tab (bottom panel) → Look for red text
├── Usually MainActivity.java errors
├── Or missing dependencies
└── Solution: Check MainActivity.java has WebView config
```

### Device Connection:
```
Toolbar → No device shown?
├── Enable USB Debugging on phone
├── Install device drivers
├── Try different USB cable
└── Restart Android Studio
```

---

## 📋 Complete Workflow Summary

### 1. Open Project
```
Start Android Studio → Open → Navigate to app/android folder
```

### 2. Wait for Sync
```
Bottom progress bar: "Gradle Sync in progress..."
Wait until: "Gradle sync finished"
```

### 3. Build
```
Build → Clean Project (wait)
Build → Rebuild Project (wait)  
Build → Build APK(s) → Build APK(s) (wait)
```

### 4. Run
```
Connect device OR start emulator
Click green ▶ Run button
Select device from dropdown
Wait for app to install and launch
```

### 5. Test
```
In the app:
✓ Desktop layout visible
✓ All animations working
✓ No mobile switching
✓ Smooth scrolling
✓ Touch interactions working
```

---

## ⚡ Pro Tips

### Speed Up Development:
```
Instead of building APK each time:
1. Use ▶ Run button directly (builds and runs)
2. Use 🐞 Debug button for debugging
3. Use Ctrl+R to hot-swap changes (when possible)
```

### Useful Panels to Monitor:
```
Bottom of Android Studio:
├── Build (shows compilation progress)
├── Logcat (shows app runtime logs)
├── Run (shows app output)
└── TODO (shows task comments)
```

### File Locations to Check:
```
Project Explorer (left panel):
app/
├── src/main/
│   ├── java/com/ecoloopkenya/app/
│   │   └── MainActivity.java ← WebView config here
│   └── assets/public/
│       ├── index.html ← Website file
│       └── desktop-view-test.html ← Test file
└── build/outputs/apk/debug/
    └── app-debug.apk ← Built app file
```

---

## 🎉 You're Ready!

Follow these steps exactly and your Android app will display the desktop website layout perfectly across all devices! 🚀

**Remember:** The key is that MainActivity.java has the WebView configuration that forces desktop view, and the index.html files have the viewport meta tags.
