set -eu
mkdir -p /tmp/lbs-qa-output
trap 'adb logcat -d -s "ReactNativeJS:*" "AndroidRuntime:E" > /tmp/lbs-qa-output/app.log; adb exec-out screencap -p > /tmp/lbs-qa-output/screen.png' EXIT
gh run watch "$BUILD_RUN" --exit-status --interval 30
gh run download "$BUILD_RUN" --name lbs-android --dir /tmp/lbs-test-apk
adb shell getprop ro.product.cpu.abilist
adb install -g /tmp/lbs-test-apk/app-release.apk
adb shell wm size 1080x2400
adb shell wm density 310
adb shell am start -n com.lbs.interiorstudio/.MainActivity
python .github/qa/room-smoke.py
