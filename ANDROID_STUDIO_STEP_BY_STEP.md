# Android Studio Step-by-Step Guide

## 🎯 Opening Your Project in Android Studio

### Step 1: Launch Android Studio
1. Open Android Studio from your desktop or Start menu
2. You'll see the welcome screen with options

### Step 2: Open Existing Project
1. Click **"Open"** (or "Open an existing project")
2. Navigate to this exact path:
   ```
   c:\Users\POZEH\Documents\Shoping-website-main\Shoping-website-main\app\android
   ```
3. Select the `android` folder and click **"OK"**

### Step 3: Wait for Project Setup
- Android Studio will load the project
- Gradle will start syncing (this may take 2-5 minutes)
- Wait for the sync to complete (bottom progress bar)

---

## 🔨 Building Your App

### Step 4: Clean the Project
1. Go to the top menu bar
2. Click **Build** → **Clean Project**
3. Wait for cleaning to complete (bottom status bar)

### Step 5: Rebuild the Project  
1. Go to **Build** → **Rebuild Project**
2. This compiles all your Java/Kotlin files
3. Wait for rebuild to complete

### Step 6: Build APK
1. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Choose **"debug"** variant (default)
3. Wait for APK build to complete
4. APK will be saved in: `app/build/outputs/apk/debug/`

---

## 📱 Running the App

### Option A: Using Android Device
1. **Enable Developer Options** on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options
   - Enable "USB Debugging"

2. **Connect Your Device**:
   - Connect phone to computer via USB
   - Allow debugging permission on phone
   - Device should appear in Android Studio toolbar

3. **Run the App**:
   - Click the green **"Run"** button (▶) in toolbar
   - Or press **Shift + F10**
   - Select your connected device
   - App will install and launch

### Option B: Using Emulator
1. **Create Emulator** (if you don't have one):
   - Click **Tools** → **AVD Manager**
   - Click **"Create Virtual Device"**
   - Choose a phone model (e.g., Pixel 6)
   - Select system image (API 30+)
   - Finish setup

2. **Start Emulator**:
   - Click the green **"Run"** button (▶)
   - Select your emulator from the dropdown
   - Wait for emulator to start
   - App will install and launch

---

## 🔍 Verifying Desktop View Works

### What You Should See:
✅ **Desktop Layout**: Website shows full 1200px desktop layout
✅ **No Mobile Switching**: Layout stays desktop even on small screens
✅ **No Zoom**: Pinch gestures don't work (disabled)
✅ **Smooth Scrolling**: Vertical scrolling works perfectly
✅ **All Animations**: Ocean waves, particles, hero sections work
✅ **Interactive Elements**: Buttons, forms, navigation work

### Test These Features:
1. **Hero Sections**: Should display full desktop version
2. **NyumbaSure Dashboard**: Should load completely
3. **Navigation**: All menu items should be accessible
4. **Animations**: Background effects should run smoothly
5. **Footer**: Should be fully visible and scrollable

---

## 🛠 Troubleshooting Common Issues

### Issue: Gradle Sync Fails
**Solution:**
1. Click **"Try Again"** in the sync notification
2. Or go to **File** → **Sync Project with Gradle Files**
3. Check internet connection (needs to download dependencies)

### Issue: Build Fails
**Solution:**
1. Check for red error messages in the Build tab
2. Make sure JAVA_HOME is set (Android Studio usually handles this)
3. Try **File** → **Invalidate Caches / Restart**

### Issue: App Doesn't Install
**Solution:**
1. Make sure USB debugging is enabled on device
2. Try uninstalling old app version first
3. Check if device has storage space

### Issue: Desktop View Not Working
**Solution:**
1. Check that MainActivity.java changes were applied
2. Verify assets folder contains updated index.html
3. Look at Android Logcat for WebView errors

---

## 📋 Quick Reference Commands

### In Android Studio Terminal:
```bash
# Navigate to project directory
cd app/android

# Clean project
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug

# Run tests
./gradlew test
```

### File Locations:
- **MainActivity**: `app/src/main/java/com/ecoloopkenya/app/MainActivity.java`
- **Website Assets**: `app/src/main/assets/public/`
- **Built APK**: `app/build/outputs/apk/debug/app-debug.apk`

---

## 🎉 Success Indicators

When everything works correctly:
- ✅ Android Studio shows "BUILD SUCCESSFUL"
- ✅ App installs on device/emulator without errors
- ✅ App opens showing desktop website layout
- ✅ All website features work as expected
- ✅ No mobile layout switching occurs

Your app is now ready with forced desktop view! 🚀
