set -eu
mkdir -p /tmp/lbs-qa-output
trap 'adb logcat -d -s "ReactNativeJS:*" "AndroidRuntime:E" > /tmp/lbs-qa-output/app.log; adb exec-out screencap -p > /tmp/lbs-qa-output/screen.png' EXIT
test "$(gh run view "$BUILD_RUN" --json conclusion --jq .conclusion)" = success
gh run download "$BUILD_RUN" --name lbs-android --dir /tmp/lbs-test-apk
adb shell getprop ro.product.cpu.abilist
adb install -g /tmp/lbs-test-apk/app-release.apk
# SoLoader on this x86 emulator searches base.apk!/lib/x86_64 when running translated ARM.
# Populate the actual package ARM library directory with the APK's unmodified binaries.
adb root
adb wait-for-device
libdir=$(adb shell dumpsys package com.lbs.interiorstudio | sed -n 's/^ *legacyNativeLibraryDir=//p' | head -1 | tr -d '\r')/arm64
unzip -q /tmp/lbs-test-apk/app-release.apk 'lib/arm64-v8a/*' -d /tmp/lbs-test-apk
adb shell mkdir -p "$libdir"
adb push /tmp/lbs-test-apk/lib/arm64-v8a/. "$libdir/"
adb shell restorecon -RF "$libdir"
adb shell wm size 1080x2400
adb shell wm density 310
adb shell am start -n com.lbs.interiorstudio/.MainActivity
python .github/qa/room-smoke.py
