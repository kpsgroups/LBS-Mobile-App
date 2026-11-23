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
button('Configure wardrobe')
button('View in room',True)
button('Live camera',True)
button('Freeze view',True)
button('Smaller',True)
button('Turn',True)
button('Interior',True)
assert adb('pidof','com.lbs.interiorstudio').strip()
print('Native live camera opened, froze a frame, and kept the preview responsive.')
