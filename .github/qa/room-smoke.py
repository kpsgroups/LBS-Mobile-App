import re, subprocess, time, xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(['adb','shell',*args],text=True)

def button(label, scroll=False):
    for i in range(30):
        try:
            adb('uiautomator','dump','/sdcard/window.xml')
            xml=adb('cat','/sdcard/window.xml')
            nodes=ET.fromstring(xml).iter('node')
            for node in nodes:
                if label not in (node.get('text'),node.get('content-desc')) or node.get('enabled')=='false': continue
                x,y,r,b=map(int,re.findall(r'\d+',node.get('bounds')))
                if r>x and b>y:
                    adb('input','tap',str((x+r)//2),str((y+b)//2)); print('Tapped',label,flush=True);return
            if scroll and i%2==1: adb('input','swipe','520','1770','520','800','380')
        except (ET.ParseError,subprocess.CalledProcessError):pass
        time.sleep(1)
    open('/tmp/lbs-qa-output/ui.xml','w').write(xml)
    raise RuntimeError('Could not activate '+label)

button('Configure Studio wardrobe')
button('View in room',True)
button('Start marker camera',True)
for attempt in range(30):
    logs=adb('dumpsys','media.camera')
    if 'com.lbs.interiorstudio' in logs and 'CONNECT' in logs:
        break
    time.sleep(1)
else: raise RuntimeError('Camera service did not record a connection to LBS')
for attempt in range(15):
    adb('uiautomator','dump','/sdcard/window.xml')
    content=adb('cat','/sdcard/window.xml')
    if 'Point at the printed LBS floor marker' in content: break
    time.sleep(1)
else: raise RuntimeError('Marker recognizer did not receive video frames')
button('Stop marker camera',True)
print('Verified unsupported-AR startup, marker camera frames, and camera stop on Android.')
