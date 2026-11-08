import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { GlowButton } from "@/components/ui/GlowButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import {
  Camera, CloudUpload, Loader2, RotateCcw, Save, Sparkles, UtensilsCrossed, 
  ArrowLeft, TrendingUp, Zap, ListChecks, Share2, History, Flame
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";

const FOOD_RECOGNITION_API_URL = "http://192.168.1.45:5000/predict";
const FOOD_RECOGNITION_UNAVAILABLE_MESSAGE =
  "Food recognition service is unavailable. Please make sure the Flask server is running.";

const INDIAN_FOOD_LABELS = [
  "Idli", "Dosa", "Masala Dosa", "Uttapam", "Pongal", "Upma", "Vada", "Poha",
  "Chapati", "Roti", "Paratha", "Puri", "Rice", "Lemon Rice", "Curd Rice",
  "Biryani", "Chicken Biryani", "Pulav", "Dal", "Sambar", "Rasam", "Rajma",
  "Chole", "Paneer Butter Masala", "Paneer Curry", "Chicken Curry", "Fish Curry",
  "Egg Curry", "South Indian Thali", "North Indian Thali", "Snack", "Sweets",
];

// Only include phase-1 supported foods with requested nutrition values; fallback entries retained minimally
const NUTRITION_PRESETS: Record<string, { calories: number; protein: number; carbs: number; fat: number; serving: string }> = {
  Idli: { calories: 58, protein: 2, carbs: 12, fat: 0.4, serving: "1 Idli" },
  Dosa: { calories: 168, protein: 4, carbs: 28, fat: 4, serving: "1 Dosa" },
  Upma: { calories: 190, protein: 5, carbs: 30, fat: 6, serving: "1 Bowl" },
  Pongal: { calories: 220, protein: 6, carbs: 34, fat: 7, serving: "1 Bowl" },
  "Rice + Sambar": { calories: 320, protein: 9, carbs: 58, fat: 5, serving: "1 Plate" },
  "South Indian Thali": { calories: 650, protein: 18, carbs: 95, fat: 18, serving: "1 Plate" },
  // generic fallback
  Rice: { calories: 206, protein: 4, carbs: 45, fat: 0.4, serving: "1 Cup" },
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
  mealType?: string;
  timestamp: Timestamp | null;
};

function classifyServingSize(foodName: string, confidence: number, imageSize: { width: number; height: number }) {
  const area = imageSize.width * imageSize.height;
  const portionScale = confidence > 0.7 ? 1 : confidence > 0.45 ? 0.75 : 0.6;

  if (foodName.includes("Biryani") || foodName.includes("Thali") || foodName.includes("Rice") || foodName.includes("Pulav")) {
    return area > 750000 ? "1 Plate" : area > 350000 ? "1 Bowl" : "1 Serving";
  }

  if (foodName === "Idli") {
    return area > 500000 ? "2 Idlis" : "1 Idli";
  }

  if (foodName === "Dosa" || foodName === "Masala Dosa" || foodName === "Uttapam") {
    return area > 700000 ? `2 ${foodName === "Uttapam" ? "Uttapams" : "Dosas"}` : `1 ${foodName}`;
  }

  if (foodName.includes("Curry") || foodName === "Dal" || foodName === "Sambar" || foodName === "Rasam") {
    return area > 500000 ? "1.5 Bowls" : "1 Bowl";
  }

  return portionScale > 0.8 ? `1 ${foodName}` : `Small serving of ${foodName}`;
}

function scaleNutrition(base: Nutrition, servingSize: string, confidence: number) {
  const multiplier = servingSize.includes("2 ") ? 2 : servingSize.includes("1.5") ? 1.5 : servingSize.includes("Small") ? 0.7 : confidence > 0.7 ? 1 : confidence > 0.45 ? 0.85 : 0.75;
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
  const sanitized = label.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (sanitized.includes("masala dosa")) return "Masala Dosa";
  if (sanitized.includes("dosa")) return "Dosa";
  if (sanitized.includes("idli")) return "Idli";
  if (sanitized.includes("biryani")) return sanitized.includes("chicken") ? "Chicken Biryani" : "Biryani";
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

function buildMealNutrition(label: string, confidence: number, imageSize: { width: number; height: number }): Nutrition {
  const displayFoodName = label;
  const nutritionLabel = normalizePrediction(label);
  const base = NUTRITION_PRESETS[nutritionLabel] ?? NUTRITION_PRESETS.Rice;
  const servingSize = classifyServingSize(nutritionLabel, confidence, imageSize);
  const scaled = scaleNutrition(base, servingSize, confidence);
  return {
    foodName: displayFoodName,
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

function getCameraErrorMessage(error: unknown) {
  const errorName = error instanceof Error ? error.name : "";
  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access for Health Drift AI in Android Settings, then try again.";
  }
  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "No camera was found on this device. You can upload a meal image instead.";
  }
  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return "The camera is unavailable or being used by another app. Close other camera apps and try again.";
  }
  if (errorName === "SecurityError") {
    return "Camera access is blocked in this context. Open the installed app or use a secure HTTPS page.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unable to access the camera. Check camera permissions or upload a meal image instead.";
}

export function FoodDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [streamReady, setStreamReady] = React.useState(false);
  const [nutrition, setNutrition] = React.useState<Nutrition | null>(null);
  const [selectedMealType, setSelectedMealType] = React.useState<string | null>(null);
  const [mealEntries, setMealEntries] = React.useState<MealEntry[]>([]);
  const [totalToday, setTotalToday] = React.useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todayMeals, setTodayMeals] = React.useState<MealEntry[]>([]);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const userId = user?.uid ?? "";

  React.useEffect(() => {
    if (!userId) return;

    async function loadEntries() {
      const entriesRef = collection(db, "food_logs", userId, "entries");
      const snap = await getDocs(query(entriesRef, orderBy("timestamp", "desc"), limit(100)));
      const loaded = snap.docs.map((item) => item.data() as MealEntry);
      setMealEntries(loaded);

      const today = new Date();
      const todayKey = today.toDateString();
      const todayMealsList: MealEntry[] = [];
      const totals = loaded.reduce(
        (acc, entry) => {
          const entryDate = entry.timestamp?.toDate?.()?.toDateString();
          if (entryDate === todayKey) {
            acc.calories += Number(entry.calories ?? 0);
            acc.protein += Number(entry.protein ?? 0);
            acc.carbs += Number(entry.carbs ?? 0);
            acc.fat += Number(entry.fat ?? 0);
            todayMealsList.push(entry);
          }
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      setTotalToday(totals);
      setTodayMeals(todayMealsList);
    }

    loadEntries().catch((error) => console.error("Failed to load food entries", error));
  }, [userId]);

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
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable in this context. Open the installed app or use a secure HTTPS page.");
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      setStreamReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: unknown) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
      setStreamReady(false);
      const message = getCameraErrorMessage(error);
      setCameraError(message);
      toast.error(message);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setStreamReady(false);
  }

  async function analyzeImage(file: File, imageSize: { width: number; height: number }) {
    const formData = new FormData();
    formData.append("image", file);

    let response: Response;
    try {
      response = await fetch(FOOD_RECOGNITION_API_URL, {
        method: "POST",
        body: formData,
      });
    } catch {
      throw new Error(FOOD_RECOGNITION_UNAVAILABLE_MESSAGE);
    }

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(FOOD_RECOGNITION_UNAVAILABLE_MESSAGE);
      }
      throw new Error(`Food recognition request failed (HTTP ${response.status}).`);
    }

    const prediction = (await response.json()) as {
      predicted_food?: unknown;
      confidence?: unknown;
    };
    const label = prediction.predicted_food;
    const confidence = prediction.confidence;
    if (
      typeof label !== "string" ||
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) {
      throw new Error("Food recognition service returned an invalid prediction.");
    }

    return buildMealNutrition(label, confidence, imageSize);
  }

  async function handleFileChange(file: File) {
    setBusy(true);
    setAnalyzing(true);
    try {
      const imageSize = await getImageSize(file);
      const image = await readFileAsImageData(file);
      const result = await analyzeImage(file, imageSize);
      setImageSrc(image);
      setNutrition(result);
      setSelectedMealType(null);
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
      const result = await analyzeImage(pseudoFile, imageSize);
      setImageSrc(image);
      setNutrition(result);
      setSelectedMealType(null);
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
    if (!userId || !nutrition || !selectedMealType) {
      toast.error("Please select a meal type before saving.");
      return;
    }
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
        mealType: selectedMealType,
        timestamp: serverTimestamp(),
      };
      await setDoc(entryRef, entry);
      
      // Update today's meals and totals
      const newMeal: MealEntry = { ...entry, timestamp: null };
      setTodayMeals((prev) => [newMeal, ...prev]);
      setMealEntries((prev) => [newMeal, ...prev]);
      setTotalToday((prev) => ({
        calories: prev.calories + nutrition.calories,
        protein: prev.protein + nutrition.protein,
        carbs: prev.carbs + nutrition.carbs,
        fat: prev.fat + nutrition.fat,
      }));
      
      toast.success("Meal saved successfully.");
      setNutrition(null);
      setImageSrc(null);
      setSelectedMealType(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Could not save meal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased p-4 sm:p-8 pb-32">
      <AuroraBackground />
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="p-3 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-4xl sm:text-5xl mb-2 text-aurora">🍽 Food Dashboard</h1>
              <p className="text-muted-foreground">Track meals, nutrition, and food habits</p>
            </div>
          </div>
        </div>

        {/* SECTION 1: MEAL CAPTURE */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Camera className="h-5 w-5 text-orange-400" />
              Scan New Meal
            </CardTitle>
            <CardDescription>Capture food in real-time or upload a meal image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={startCamera} disabled={busy || analyzing || cameraActive}>
                <Camera className="h-4 w-4" /> Open Camera
              </Button>
              <label className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <CloudUpload className="h-4 w-4" /> Upload Image
                <input
                  type="file"
                  accept="image/*"
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
                <>
                  <Button type="button" variant="outline" onClick={captureFromCamera} disabled={busy || analyzing}>
                    <Camera className="h-4 w-4" /> Capture Photo
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera} disabled={busy || analyzing}>
                    <RotateCcw className="h-4 w-4" /> Cancel Camera
                  </Button>
                </>
              )}
            </div>

            {cameraError && <p className="text-sm text-red-400">{cameraError}</p>}

            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-3">
              {cameraActive ? (
                <video ref={videoRef} className="aspect-video w-full rounded-xl bg-black object-cover" playsInline muted />
              ) : imageSrc ? (
                <img src={imageSrc} alt="Captured meal" className="aspect-video w-full rounded-xl object-cover" />
              ) : (
                <div className="grid aspect-video place-items-center rounded-xl text-sm text-muted-foreground">
                  {analyzing ? "Analyzing image..." : "Camera preview or uploaded image will appear here."}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? (
                "Running food detection..."
              ) : (
                "Food recognition service: Flask API"
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2 & 3 & 4: DETECTION + PORTION + NUTRITION RESULTS */}
        {nutrition && !selectedMealType && (
          <Card className="border-orange-400/20 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="text-2xl text-orange-200">Detected Food & Nutrition</CardTitle>
              <CardDescription>Review the food detection results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg mb-4">Food Detection</h4>
                  <DetailRow label="Food Name" value={nutrition.foodName} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg mb-4">Nutrition Facts</h4>
                  <DetailRow label="Calories" value={`${nutrition.calories} kcal`} />
                  <DetailRow label="Protein" value={`${nutrition.protein} g`} />
                  <DetailRow label="Carbs" value={`${nutrition.carbs} g`} />
                  <DetailRow label="Fat" value={`${nutrition.fat} g`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 5: MEAL TYPE SELECTION */}
        {nutrition && !selectedMealType && (
          <Card className="border-purple-400/20 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="text-2xl text-purple-200">Select Meal Type</CardTitle>
              <CardDescription>Choose when this meal is being consumed.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["Breakfast", "Lunch", "Evening Snack", "Dinner"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealType(type)}
                    className="p-4 rounded-lg border-2 border-purple-400/30 hover:border-purple-400 hover:bg-purple-500/10 transition-all text-center font-medium"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 6: SAVE MEAL */}
        {nutrition && selectedMealType && (
          <Card className="border-emerald-400/20 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="text-2xl text-emerald-200">Confirm & Save</CardTitle>
              <CardDescription>Meal Type: {selectedMealType}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button type="button" onClick={saveMeal} disabled={busy}>
                <Save className="h-4 w-4" /> Confirm & Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNutrition(null);
                  setImageSrc(null);
                  setSelectedMealType(null);
                  setCameraActive(false);
                  stopCamera();
                }}
                disabled={busy}
              >
                <RotateCcw className="h-4 w-4" /> Retake Photo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* TODAY'S NUTRITION SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Today's Nutrition</CardTitle>
              <CardDescription>Daily totals from all meals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatTile label="Total Calories" value={`${totalToday.calories} kcal`} />
              <StatTile label="Total Protein" value={`${totalToday.protein} g`} />
              <StatTile label="Total Carbs" value={`${totalToday.carbs} g`} />
              <StatTile label="Total Fat" value={`${totalToday.fat} g`} />
            </CardContent>
          </Card>

          {/* NUTRITION INSIGHTS */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Nutrition Insights</CardTitle>
              <CardDescription>Based on today's meals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InsightCard label="Calories Consumed" value={`${totalToday.calories} kcal`} icon={<Flame className="w-5 h-5 text-orange-400" />} />
              <InsightCard label="Protein Intake" value={`${totalToday.protein} g`} icon={<TrendingUp className="w-5 h-5 text-red-400" />} />
              <InsightCard label="Carb Intake" value={`${totalToday.carbs} g`} icon={<TrendingUp className="w-5 h-5 text-blue-400" />} />
              <InsightCard label="Fat Intake" value={`${totalToday.fat} g`} icon={<TrendingUp className="w-5 h-5 text-yellow-400" />} />
            </CardContent>
          </Card>
        </div>

        {/* TODAY'S FOOD LOG */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Today's Food Log</CardTitle>
            <CardDescription>All meals logged today</CardDescription>
          </CardHeader>
          <CardContent>
            {todayMeals.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground text-center">
                No meals logged yet today.
              </div>
            ) : (
              <div className="space-y-2">
                {todayMeals.map((entry, index) => (
                  <div key={`${entry.foodName}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="flex-grow">
                      <div className="font-medium text-foreground">{entry.mealType}</div>
                      <div className="text-muted-foreground">{entry.foodName} • {entry.servingSize}</div>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <div className="font-semibold text-foreground">{entry.calories} kcal</div>
                      <div className="text-xs">{entry.protein}g P • {entry.carbs}g C • {entry.fat}g F</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QUICK ACTIONS */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => { setNutrition(null); setImageSrc(null); }}>
              <Camera className="h-4 w-4" /> Scan New Meal
            </Button>
            <Button variant="outline">
              <History className="h-4 w-4" /> View Food History
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4" /> Export Nutrition Report
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
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

function InsightCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-black/30">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}