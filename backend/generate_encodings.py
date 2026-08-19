import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis

KNOWN_FACES_DIR = "known_faces"

app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=0, det_size=(640, 640))

known_encodings = []
known_names = []

for person_name in os.listdir(KNOWN_FACES_DIR):
    person_folder = os.path.join(KNOWN_FACES_DIR, person_name)

    if not os.path.isdir(person_folder):
        continue

    for filename in os.listdir(person_folder):
        image_path = os.path.join(person_folder, filename)

        img = cv2.imread(image_path)
        if img is None:
            continue

        faces = app.get(img)

        if len(faces) == 0:
            print(f"No face detected in {image_path}")
            continue

        embedding = faces[0].embedding
        embedding = embedding / np.linalg.norm(embedding)

        known_encodings.append(embedding)
        known_names.append(person_name)

        print(f"Encoded {person_name} - {filename}")

np.save("encodings.npy", {
    "encodings": known_encodings,
    "names": known_names
})

print("Encodings saved successfully.")
print(f"Total encodings: {len(known_encodings)}")
