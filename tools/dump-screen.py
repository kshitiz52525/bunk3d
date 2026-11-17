import re,sys
for f in sys.argv[1:]:
    s=open('design/screens/'+f+'.dc.html').read()
    i=s.find('<x-dc>'); j=s.find('<script',i)
    b=s[i:j]
    b=re.sub(r'<helmet>.*?</helmet>','',b,flags=re.S)
    b=re.sub(r'<svg[^>]*>(.*?)</svg>',lambda m:'<svg:'+','.join(re.findall(r' d="([^"]{0,60})',m.group(1))[:2])+'>',b,flags=re.S)
    b=re.sub(r'(display|box-sizing|font-family|text-decoration): ?[^;"]*;? ?','',b) if False else b
    b=b.replace('box-sizing: border-box; ','').replace('font-family: Inter, system-ui, sans-serif; ','')
    print('=====',f); print(re.sub(r'\s+',' ',b))
