import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Camera,
  CloudUpload,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { pipeline } from "@xenova/transformers";

const INDIAN_FOOD_LABELS = [
  "Idli",
  "Dosa",
  "Masala Dosa",
  "Uttapam",
  "Pongal",
  "Upma",
  "Vada",
  "Poha",
  "Chapati",
  "Roti",
  "Paratha",
  "Puri",
  "Rice",
  "Lemon Rice",
  "Curd Rice",
  "Biryani",
  "Chicken Biryani",
  "Pulav",
  "Dal",
  "Sambar",
  "Rasam",
  "Rajma",
  "Chole",
  "Paneer Butter Masala",
  "Paneer Curry",
  "Chicken Curry",
  "Fish Curry",
  "Egg Curry",
  "South Indian Thali",
  "North Indian Thali",
  "Snack",
  "Sweets",
];

const NUTRITION_PRESETS: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number; serving: string }
> = {
  Idli: { calories: 58, protein: 2, carbs: 12, fat: 0.4, serving: "1 Idli" },
  Dosa: { calories: 168, protein: 4, carbs: 24, fat: 6, serving: "1 Dosa" },
  "Masala Dosa": { calories: 380, protein: 8, carbs: 52, fat: 14, serving: "1 Dosa" },
  Uttapam: { calories: 210, protein: 5, carbs: 32, fat: 7, serving: "1 Uttapam" },
  Pongal: { calories: 240, protein: 7, carbs: 38, fat: 8, serving: "1 Bowl" },
  Upma: { calories: 190, protein: 5, carbs: 30, fat: 6, serving: "1 Bowl" },
  Vada: { calories: 130, protein: 3, carbs: 15, fat: 7, serving: "1 Vada" },
  Poha: { calories: 220, protein: 4, carbs: 34, fat: 8, serving: "1 Bowl" },
  Chapati: { calories: 110, protein: 3, carbs: 20, fat: 2, serving: "1 Chapati" },
  Roti: { calories: 100, protein: 3, carbs: 19, fat: 2, serving: "1 Roti" },
  Paratha: { calories: 220, protein: 5, carbs: 28, fat: 9, serving: "1 Paratha" },
  Puri: { calories: 110, protein: 2, carbs: 12, fat: 6, serving: "1 Puri" },
  Rice: { calories: 206, protein: 4, carbs: 45, fat: 0.4, serving: "1 Cup" },
  "Lemon Rice": { calories: 280, protein: 5, carbs: 46, fat: 9, serving: "1 Plate" },
  "Curd Rice": { calories: 260, protein: 7, carbs: 34, fat: 10, serving: "1 Bowl" },
  Biryani: { calories: 520, protein: 19, carbs: 58, fat: 22, serving: "1 Plate" },
  "Chicken Biryani": { calories: 560, protein: 28, carbs: 56, fat: 24, serving: "1 Plate" },
  Pulav: { calories: 330, protein: 8, carbs: 54, fat: 10, serving: "1 Plate" },
  Dal: { calories: 180, protein: 11, carbs: 22, fat: 5, serving: "1 Bowl" },
  Sambar: { calories: 130, protein: 5, carbs: 19, fat: 4, serving: "1 Bowl" },
  Rasam: { calories: 70, protein: 2, carbs: 10, fat: 2, serving: "1 Bowl" },
  Rajma: { calories: 240, protein: 14, carbs: 34, fat: 6, serving: "1 Bowl" },
  Chole: { calories: 260, protein: 13, carbs: 32, fat: 8, serving: "1 Bowl" },
  "Paneer Butter Masala": { calories: 390, protein: 16, carbs: 18, fat: 29, serving: "1 Bowl" },
  "Paneer Curry": { calories: 320, protein: 15, carbs: 14, fat: 24, serving: "1 Bowl" },
  "Chicken Curry": { calories: 310, protein: 27, carbs: 8, fat: 18, serving: "1 Bowl" },
  "Fish Curry": { calories: 280, protein: 24, carbs: 8, fat: 16, serving: "1 Bowl" },
  "Egg Curry": { calories: 250, protein: 18, carbs: 9, fat: 16, serving: "1 Bowl" },
  "South Indian Thali": { calories: 720, protein: 22, carbs: 96, fat: 28, serving: "1 Plate" },
  "North Indian Thali": { calories: 780, protein: 25, carbs: 100, fat: 30, serving: "1 Plate" },
  Snack: { calories: 180, protein: 4, carbs: 20, fat: 9, serving: "1 Serving" },
  Sweets: { calories: 240, protein: 4, carbs: 36, fat: 10, serving: "1 Serving" },
};

type Nutrition = {
  foodName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealEntry = Nutrition & {
  uid: string;
  timestamp: Timestamp | null;
};

function classifyServingSize(
  foodName: string,
  confidence: number,
  imageSize: { width: number; height: number },
) {
  const area = imageSize.width * imageSize.height;
  const portionScale = confidence > 0.7 ? 1 : confidence > 0.45 ? 0.75 : 0.6;

  if (
    foodName.includes("Biryani") ||
    foodName.includes("Thali") ||
    foodName.includes("Rice") ||
    foodName.includes("Pulav")
  ) {
    return area > 750000 ? "1 Plate" : area > 350000 ? "1 Bowl" : "1 Serving";
  }

  if (foodName === "Idli") {
    return area > 500000 ? "2 Idlis" : "1 Idli";
  }

  if (foodName === "Dosa" || foodName === "Masala Dosa" || foodName === "Uttapam") {
    return area > 700000 ? `2 ${foodName === "Uttapam" ? "Uttapams" : "Dosas"}` : `1 ${foodName}`;
  }

  if (
    foodName.includes("Curry") ||
    foodName === "Dal" ||
    foodName === "Sambar" ||
    foodName === "Rasam"
  ) {
    return area > 500000 ? "1.5 Bowls" : "1 Bowl";
  }

  return portionScale > 0.8 ? `1 ${foodName}` : `Small serving of ${foodName}`;
}

function scaleNutrition(base: Nutrition, servingSize: string, confidence: number) {
  const multiplier = servingSize.includes("2 ")
    ? 2
    : servingSize.includes("1.5")
      ? 1.5
      : servingSize.includes("Small")
        ? 0.7
        : confidence > 0.7
          ? 1
          : confidence > 0.45
            ? 0.85
            : 0.75;
  return {
    calories: Math.round(base.calories * multiplier),
    protein: Math.round(base.protein * multiplier * 10) / 10,
    carbs: Math.round(base.carbs * multiplier * 10) / 10,
    fat: Math.round(base.fat * multiplier * 10) / 10,
  };
}

function normalizePrediction(label: string) {
  const exact = INDIAN_FOOD_LABELS.find((entry) => entry.toLowerCase() === label.toLowerCase());
  if (exact) return exact;
  const sanitized = label
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
  if (sanitized.includes("masala dosa")) return "Masala Dosa";
  if (sanitized.includes("dosa")) return "Dosa";
  if (sanitized.includes("idli")) return "Idli";
  if (sanitized.includes("biryani"))
    return sanitized.includes("chicken") ? "Chicken Biryani" : "Biryani";
  if (sanitized.includes("paneer butter")) return "Paneer Butter Masala";
  if (sanitized.includes("paneer")) return "Paneer Curry";
  if (sanitized.includes("chicken curry")) return "Chicken Curry";
  if (sanitized.includes("fish curry")) return "Fish Curry";
  if (sanitized.includes("egg curry")) return "Egg Curry";
  if (sanitized.includes("curd rice")) return "Curd Rice";
  if (sanitized.includes("lemon rice")) return "Lemon Rice";
  if (sanitized.includes("pulav")) return "Pulav";
  if (sanitized.includes("poha")) return "Poha";
  if (sanitized.includes("upma")) return "Upma";
  if (sanitized.includes("vada")) return "Vada";
  if (sanitized.includes("chapati")) return "Chapati";
  if (sanitized.includes("roti")) return "Roti";
  if (sanitized.includes("paratha")) return "Paratha";
  if (sanitized.includes("puri")) return "Puri";
  if (sanitized.includes("dal")) return "Dal";
  if (sanitized.includes("sambar")) return "Sambar";
  if (sanitized.includes("rasam")) return "Rasam";
  if (sanitized.includes("rajma")) return "Rajma";
  if (sanitized.includes("chole")) return "Chole";
  if (sanitized.includes("south indian")) return "South Indian Thali";
  if (sanitized.includes("north indian")) return "North Indian Thali";
  if (sanitized.includes("sweet")) return "Sweets";
  return "Rice";
}

function buildMealNutrition(
  label: string,
  confidence: number,
  imageSize: { width: number; height: number },
): Nutrition {
  const foodName = normalizePrediction(label);
  const base = NUTRITION_PRESETS[foodName] ?? NUTRITION_PRESETS.Rice;
  const servingSize = classifyServingSize(foodName, confidence, imageSize);
  const scaled = scaleNutrition(base, servingSize, confidence);
  return {
    foodName,
    servingSize,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
  };
}

function getImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({ width: image.width, height: image.height });
      image.onerror = () => reject(new Error("Could not load image"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsImageData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function FoodIntakeModule({ userId }: { userId: string }) {
  const [modelReady, setModelReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [streamReady, setStreamReady] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [nutrition, setNutrition] = React.useState<Nutrition | null>(null);
  const [mealEntries, setMealEntries] = React.useState<MealEntry[]>([]);
  const [totalToday, setTotalToday] = React.useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const classifierRef = React.useRef<Awaited<ReturnType<typeof pipeline>> | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    async function loadEntries() {
      const entriesRef = collection(db, "food_logs", userId, "entries");
      const snap = await getDocs(query(entriesRef, orderBy("timestamp", "desc"), limit(50)));
      const loaded = snap.docs.map((item) => item.data() as MealEntry);
      setMealEntries(loaded);

      const today = new Date();
      const todayKey = today.toDateString();
      const totals = loaded.reduce(
        (acc, entry) => {
          const entryDate = entry.timestamp?.toDate?.()?.toDateString();
          if (entryDate === todayKey) {
            acc.calories += Number(entry.calories ?? 0);
            acc.protein += Number(entry.protein ?? 0);
            acc.carbs += Number(entry.carbs ?? 0);
            acc.fat += Number(entry.fat ?? 0);
          }
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      setTotalToday(totals);
    }

    loadEntries().catch((error) => console.error("Failed to load food entries", error));
  }, [userId]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadClassifier() {
      try {
        const classifier = await pipeline(
          "zero-shot-image-classification",
          "Xenova/clip-vit-base-patch32",
        );
        if (!cancelled) {
          classifierRef.current = classifier;
          setModelReady(true);
        }
      } catch (error) {
        console.error("Food model failed to load", error);
        if (!cancelled) {
          toast.error("Food detection model could not load.");
        }
      }
    }

    loadClassifier();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  React.useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => undefined);
    }
  }, [streamReady, cameraActive]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setStreamReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      setCameraError(error?.message ?? "Unable to access camera.");
      toast.error("Camera access failed.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setStreamReady(false);
  }

  async function analyzeImage(source: string, imageSize: { width: number; height: number }) {
    const classifier = classifierRef.current;
    if (!classifier) {
      throw new Error("Model not ready");
    }
    const output = await classifier(source, INDIAN_FOOD_LABELS, {
      hypothesis_template: "This image contains {} food",
    });
    const best = Array.isArray(output) ? output[0] : output;
    return buildMealNutrition(best.label, best.score, imageSize);
  }

  async function handleFileChange(file: File) {
    setBusy(true);
    setAnalyzing(true);
    try {
      const imageSize = await getImageSize(file);
      const image = await readFileAsImageData(file);
      const result = await analyzeImage(image, imageSize);
      setImageSrc(image);
      setNutrition(result);
      toast.success(`Detected ${result.foodName}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Could not detect food from the image.");
    } finally {
      setAnalyzing(false);
      setBusy(false);
    }
  }

  async function captureFromCamera() {
    if (!videoRef.current) return;
    setBusy(true);
    setAnalyzing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas not available");
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.92);
      const blob = await fetch(image).then((response) => response.blob());
      const pseudoFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const imageSize = await getImageSize(pseudoFile);
      const result = await analyzeImage(image, imageSize);
      setImageSrc(image);
      setNutrition(result);
      toast.success(`Detected ${result.foodName}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Could not analyze camera image.");
    } finally {
      setAnalyzing(false);
      setBusy(false);
      stopCamera();
    }
  }

  async function saveMeal() {
    if (!userId || !nutrition) return;
    setBusy(true);
    try {
      const entryRef = doc(collection(db, "food_logs", userId, "entries"));
      const entry = {
        uid: userId,
        foodName: nutrition.foodName,
        servingSize: nutrition.servingSize,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        timestamp: serverTimestamp(),
      };
      await setDoc(entryRef, entry);
      setMealEntries((prev) => [{ ...entry, timestamp: null }, ...prev]);
      setTotalToday((prev) => ({
        calories: prev.calories + nutrition.calories,
        protein: prev.protein + nutrition.protein,
        carbs: prev.carbs + nutrition.carbs,
        fat: prev.fat + nutrition.fat,
      }));
      toast.success("Meal saved.");
      setNutrition(null);
      setImageSrc(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Could not save meal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="food-intake" className="mt-16 scroll-mt-24 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-display">Food Intake</h2>
          <p className="text-muted-foreground mt-2">
            Capture a meal, detect the dish, estimate serving size, and save nutrition to Firestore.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-400" />
          {modelReady ? "Vision model ready" : "Loading vision model..."}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UtensilsCrossed className="h-5 w-5 text-orange-400" />
              Meal Capture
            </CardTitle>
            <CardDescription>Use your camera or upload an image of the meal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={startCamera} disabled={busy || analyzing}>
                <Camera className="h-4 w-4" /> Open Camera
              </Button>
              <label className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <CloudUpload className="h-4 w-4" /> Upload Image
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleFileChange(file);
                    }
                  }}
                />
              </label>
              {cameraActive && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={captureFromCamera}
                  disabled={busy || analyzing}
                >
                  <Camera className="h-4 w-4" /> Capture Photo
                </Button>
              )}
            </div>

            {cameraError && <p className="text-sm text-red-400">{cameraError}</p>}

            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-3">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  className="aspect-video w-full rounded-xl bg-black object-cover"
                  playsInline
                  muted
                />
              ) : imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Captured meal"
                  className="aspect-video w-full rounded-xl object-cover"
                />
              ) : (
                <div className="grid aspect-video place-items-center rounded-xl text-sm text-muted-foreground">
                  {analyzing
                    ? "Analyzing image..."
                    : "Camera preview or uploaded image will appear here."}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {analyzing ? "Running food detection" : "Ready to analyze meal image"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Today's Nutrition</CardTitle>
            <CardDescription>Saved meals for today update these totals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Calories" value={`${totalToday.calories} kcal`} />
              <StatTile label="Protein" value={`${totalToday.protein} g`} />
              <StatTile label="Carbs" value={`${totalToday.carbs} g`} />
              <StatTile label="Fat" value={`${totalToday.fat} g`} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
              Food logs are stored under{" "}
              <span className="text-foreground">food_logs/{`{uid}`}/entries</span>.
            </div>
          </CardContent>
        </Card>
      </div>

      {nutrition && (
        <Card className="border-orange-400/20 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-2xl text-orange-200">Detected Food</CardTitle>
            <CardDescription>Review the prediction before saving the meal.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
              <DetailRow label="Food Name" value={nutrition.foodName} />
              <DetailRow label="Serving Size" value={nutrition.servingSize} />
              <DetailRow label="Calories" value={`${nutrition.calories} kcal`} />
              <DetailRow label="Protein" value={`${nutrition.protein} g`} />
              <DetailRow label="Carbs" value={`${nutrition.carbs} g`} />
              <DetailRow label="Fat" value={`${nutrition.fat} g`} />
            </div>
            <div className="flex flex-col justify-end gap-3">
              <Button type="button" onClick={saveMeal} disabled={busy || analyzing || !userId}>
                <Save className="h-4 w-4" /> Confirm & Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNutrition(null);
                  setImageSrc(null);
                  setCameraActive(false);
                  stopCamera();
                }}
                disabled={busy || analyzing}
              >
                <RotateCcw className="h-4 w-4" /> Retake Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Recent Meals</CardTitle>
          <CardDescription>Most recently saved items.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mealEntries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
              No meals saved yet.
            </div>
          ) : (
            mealEntries.slice(0, 5).map((entry, index) => (
              <div
                key={`${entry.foodName}-${index}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
              >
                <div>
                  <div className="font-medium text-foreground">{entry.foodName}</div>
                  <div className="text-muted-foreground">{entry.servingSize}</div>
                </div>
                <div className="text-right text-muted-foreground">
                  <div>{entry.calories} kcal</div>
                  <div>{entry.protein} g protein</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-display text-foreground">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
