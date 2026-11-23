set -eu
mkdir -p /tmp/lbs-qa-output
trap 'adb logcat -b main -b crash -b system -d > /tmp/lbs-qa-output/app.log; adb exec-out screencap -p > /tmp/lbs-qa-output/screen.png' EXIT
adb shell settings put global show_first_crash_dialog_dev_option 1
adb install -g /tmp/lbs-test-apk/app-release.apk
adb logcat -c
adb shell wm size 1080x2400
adb shell wm density 310
adb shell am start -n com.lbs.interiorstudio/.MainActivity
python .github/qa/room-smoke.py
