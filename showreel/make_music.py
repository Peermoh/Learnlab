import numpy as np, soundfile as sf
from scipy.signal import lfilter, butter, sosfilt, fftconvolve
SR=44100; DUR=87.0; N=int(SR*DUR)
rng=np.random.default_rng(5)
t=np.arange(N)/SR
L=np.zeros(N); Rr=np.zeros(N)
def mix(sig,start,gain=1.0,pan=0.0):
    i=int(start*SR); n=min(len(sig),N-i)
    if n<=0: return
    l=np.cos((pan+1)*np.pi/4); r=np.sin((pan+1)*np.pi/4)
    L[i:i+n]+=sig[:n]*gain*l; Rr[i:i+n]+=sig[:n]*gain*r
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x)
def midi(n): return 440*2**((n-69)/12)
def env(n,a,d,s,r):
    e=np.ones(n); a=int(a*SR); r=int(r*SR); d=int(d*SR)
    e[:a]=np.linspace(0,1,a,endpoint=False)
    if d>0: e[a:a+d]=np.linspace(1,s,d)
    e[a+d:]=s
    if r>0: e[-r:]*=np.linspace(1,0,r)
    return e
def inten(x,pts): # piecewise-linear intensity automation
    ts,vs=zip(*pts); return np.interp(x,ts,vs)

BPM=96; beat=60/BPM; bar=4*beat
# Am - F - C - G  (emotional), 2 bars per chord would be slow; 1 bar each -> 4-bar loop ~10s
CH=[(57,[57,60,64]),(53,[53,57,60]),(48,[55,60,64]),(55,[55,59,62])]   # root, voicing
CH=[(45,[57,60,64,69]),(41,[53,57,60,65]),(48,[55,60,64,67]),(43,[55,59,62,67])]
nbars=int(DUR/bar)+1

# ---- pad (detuned saws, filtered) -------------------------------------------------
def saw(f,n,ph=0):
    return 2*((f*np.arange(n)/SR+ph)%1)-1
pad_l=np.zeros(N); pad_r=np.zeros(N)
for b in range(nbars):
    root,notes=CH[b%4]; st=b*bar; n=int(bar*SR*1.25)
    for nt in notes:
        f=midi(nt)
        for d,pan in((-0.004,-1),(0.0,0),(0.004,1)):
            s=saw(f*(1+d),n,rng.random())*0.2
            s=lp(s,1500+inten(st,[(0,500),(30,1200),(57,2600),(79,1800)]),2)
            s*=env(n,.9,0,1,1.0)
            i=int(st*SR); m=min(n,N-i)
            if m<=0: continue
            pad_l[i:i+m]+=s[:m]*(0.5-0.25*pan); pad_r[i:i+m]+=s[:m]*(0.5+0.25*pan)
padlev=inten(t,[(0,0.0),(1,0.5),(8,0.6),(30,0.8),(57,1.0),(78,1.0),(87,0.7)])
L+=pad_l*padlev*0.5; Rr+=pad_r*padlev*0.5

# ---- sub bass --------------------------------------------------------------------
for b in range(nbars):
    st=b*bar
    if st<15: continue
    f=midi(CH[b%4][0]); n=int(bar*SR)
    s=np.sin(2*np.pi*f*np.arange(n)/SR)*env(n,.02,.3,.7,.1)
    mix(s,st,0.30*float(inten(st,[(15,.4),(31,.7),(57,1.0),(80,.8),(87,.3)])))

# ---- FM bell / pluck arpeggio -----------------------------------------------------
def bell(f,dur=1.4):
    n=int(dur*SR); x=np.arange(n)/SR
    mod=np.sin(2*np.pi*f*3.5*x)*3*np.exp(-x*5)
    s=np.sin(2*np.pi*f*x+mod)*np.exp(-x*3.2)
    s+=0.3*np.sin(2*np.pi*f*2*x)*np.exp(-x*5)
    return s
pat=[0,1,2,3,2,1,2,3]
for b in range(nbars):
    st=b*bar
    if st<13 or st>84: continue
    root,notes=CH[b%4]
    for k in range(8):
        tt=st+k*beat/2
        if tt>=84: break
        nt=notes[pat[k]]+12*(1 if st>30 else 0)+(12 if (st>57 and k%4==3) else 0)
        lev=float(inten(tt,[(13,.15),(20,.3),(31,.5),(45,.45),(57,.75),(69,.7),(79,.6),(84,.2)]))
        mix(bell(midi(nt+12)),tt,0.22*lev,pan=np.sin(tt*1.3)*0.7)

# ---- lead melody (slow emotional bells) -----------------------------------------
mel=[(31,[76,72,69,72,76,79,76,72]),(57,[79,76,72,76,79,81,84,81])]
for st0,m in mel:
    for i,nt in enumerate(m*2):
        tt=st0+i*bar/2
        if tt>st0+ (30 if st0==31 else 28): break
        mix(bell(midi(nt),2.2),tt,0.28,pan=0.2)
# closing resolution
for nt,off in((81,0),(76,.35),(72,.7),(69,1.05),(64,1.4)):
    mix(bell(midi(nt),4.5),79.6+off,0.3,pan=-0.2)

# ---- drums ----------------------------------------------------------------------
def kick():
    n=int(.5*SR); x=np.arange(n)/SR
    f=45+110*np.exp(-x*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-x*7)
def hat(o=False):
    n=int((.25 if o else .06)*SR); x=np.arange(n)/SR
    return hp(rng.standard_normal(n),7000)*np.exp(-x*(25 if o else 90))
def clap():
    n=int(.3*SR); x=np.arange(n)/SR
    return hp(lp(rng.standard_normal(n),3500),900)*np.exp(-x*20)
K,Hh,C=kick(),hat(),clap(); HO=hat(True)
for b in range(nbars):
    for k in range(4):
        tt=b*bar+k*beat
        if tt<31 or tt>=84: continue
        lev=float(inten(tt,[(31,.0),(33,.55),(45,.35),(57,.9),(69,.85),(79,.4),(84,.0)]))
        if 45<=tt<57 and k not in(0,): lev*=0.0   # sparse during the query build
        if tt>=31: mix(K,tt,0.55*lev)
        if k in(1,3) and tt>=57 and tt<79: mix(C,tt,0.18)
    if b*bar>=33 and b*bar<84:
        for k in range(8):
            tt=b*bar+k*beat/2
            if tt>=84: break
            if 45<=tt<57 and k%2==0: continue
            mix(Hh if k%2 else HO,tt,0.10 if k%2 else 0.05,pan=0.4 if k%2 else -0.3)

# ---- risers / impacts at chapter transitions --------------------------------------
def riser(dur):
    n=int(dur*SR); x=np.arange(n)/SR; nz=rng.standard_normal(n)
    out=np.zeros(n); seg=4096
    for i in range(0,n,seg):
        f=300+(i/n)**2*9000
        out[i:i+seg]=hp(nz[i:i+seg],min(f,18000),1)
    return out*(np.linspace(0,1,n)**2)
def impact():
    n=int(2.2*SR); x=np.arange(n)/SR
    return (np.sin(2*np.pi*(38+60*np.exp(-x*6))*x)*np.exp(-x*2.2)*1.0+lp(rng.standard_normal(n),1800)*np.exp(-x*3)*0.35)
IM=impact()
for tr,rs in((7.2,1.2),(15.2,1.8),(31,2.5),(45,2.0),(57,3.5),(69,1.8),(79.5,1.5)):
    mix(riser(rs),tr-rs,0.16,pan=0)
    mix(IM,tr,0.5 if tr in(31,57,79.5) else 0.28)

# ---- reverb ---------------------------------------------------------------------
irn=int(2.6*SR); ir=rng.standard_normal((2,irn))*np.exp(-np.arange(irn)/SR*2.1)[None,:]
ir=lp(ir,6000)
wetL=fftconvolve(L,ir[0],'full')[:N]*0.045; wetR=fftconvolve(Rr,ir[1],'full')[:N]*0.045
L=L*0.8+wetL; Rr=Rr*0.8+wetR

# ---- master envelope --------------------------------------------------------------
master=inten(t,[(0,0.0),(2,.55),(8,.7),(31,.95),(57,1.0),(80,.9),(87,0.0)])
fade=np.clip((DUR-t)/3,0,1)
L*=master*fade; Rr*=master*fade
np.save('/tmp/claude-0/t/audio/music_l.npy',L); np.save('/tmp/claude-0/t/audio/music_r.npy',Rr)
print('done',np.abs(L).max())
