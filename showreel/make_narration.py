import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro('/tmp/claude-0/t/tts/kokoro.onnx','/tmp/claude-0/t/tts/voices.bin')
SR=24000
L=[ # start, max_end, text
(1.0,6.6,"What if a database could understand meaning, not just match words?"),
(7.4,15.2,"Most of the world's data is unstructured. Text, images, audio. Nothing a traditional query can grasp."),
(15.8,25.4,"So we send it through an embedding model, which turns every item into a vector. A point in space, whose coordinates capture what it means."),
(26.2,31.2,"And look at that! Meaning, suddenly, has a shape."),
(32.2,41.4,"Similar ideas land close together. Cats gather with kittens. Pizza stays far away from galaxies. Distance becomes similarity."),
(45.8,55.0,"Now, ask a question. Your query goes through the same model, and becomes a point in the same space."),
(57.0,68.4,"The database simply looks around. The closest points are your answers. A kitten photo, an article about cats, even the sound of purring. Different formats, same meaning!"),
(69.2,78.4,"But comparing against millions of vectors is slow. So indexes like H N S W build a layered graph, and hop, greedily, straight toward the answer."),
(79.8,86.6,"Vector databases. Store meaning. Search by distance. That's how machines learn to find what you actually mean."),
]
out=np.zeros(int(87*SR)+SR)
for st,en,txt in L:
    sp=1.0
    for _ in range(6):
        s,_sr=k.create(txt,voice='af_heart',speed=sp,lang='en-us')
        d=len(s)/SR
        if st+d<=en: break
        sp*=1.08
    print(f"{st:5.1f} dur {d:5.2f} end {st+d:5.1f}/{en} speed {sp:.2f}")
    i=int(st*SR); out[i:i+len(s)]+=s
sf.write('/tmp/claude-0/t/audio/narr.wav',out[:87*SR],SR)
