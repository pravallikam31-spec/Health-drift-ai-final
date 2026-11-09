import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Camera,
  CloudUpload,
  Loader2,
  RotateCcw,
  Sparkles,
  UtensilsCrossed,
  ArrowLeft,
  Flame,
  Plus,
  Trash2,
  Settings,
  Server,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Edit3,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";

// ==========================================
// 1. Types & Constants
// ==========================================

export type MealType = "Breakfast" | "Lunch" | "Evening Snack" | "Dinner";

export type Nutrition = {
  foodName: string;
  servingSize: string;
  servingQty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
};

export type MealEntry = Nutrition & {
  id: string;
  uid: string;
  mealType: MealType;
  date: string;
  timestamp: Timestamp | null;
};

export type PredictionAlternative = {
  food_name: string;
  confidence: number;
};

export type PredictionResponse = {
  predicted_food: string;
  confidence: number;
  top_5_predictions?: PredictionAlternative[];
  error?: string;
};

// Base single-serving nutrition estimates for Indian cuisine classes
const NUTRITION_DATABASE: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number; serving: string }
> = {
  Idli: { calories: 58, protein: 2, carbs: 12, fat: 0.4, serving: "1 Idli" },
  Dosa: { calories: 168, protein: 4, carbs: 28, fat: 4, serving: "1 Dosa" },
  "Masala Dosa": { calories: 320, protein: 6, carbs: 45, fat: 12, serving: "1 Dosa" },
  Uttapam: { calories: 210, protein: 5, carbs: 32, fat: 7, serving: "1 Uttapam" },
  Upma: { calories: 190, protein: 5, carbs: 30, fat: 6, serving: "1 Bowl" },
  Pongal: { calories: 220, protein: 6, carbs: 34, fat: 7, serving: "1 Bowl" },
  "Ven Pongal": { calories: 220, protein: 6, carbs: 34, fat: 7, serving: "1 Bowl" },
  "Rice + Sambar": { calories: 320, protein: 9, carbs: 58, fat: 5, serving: "1 Plate" },
  "Sambar Satham": { calories: 320, protein: 9, carbs: 58, fat: 5, serving: "1 Plate" },
  "South Indian Thali": { calories: 650, protein: 18, carbs: 95, fat: 18, serving: "1 Thali" },
  "North Indian Thali": { calories: 720, protein: 22, carbs: 105, fat: 22, serving: "1 Thali" },
  "Chicken Biryani": { calories: 450, protein: 24, carbs: 55, fat: 14, serving: "1 Plate" },
  "Mutton Biryani": { calories: 520, protein: 26, carbs: 54, fat: 22, serving: "1 Plate" },
  "Veg Biryani": { calories: 340, protein: 8, carbs: 58, fat: 8, serving: "1 Plate" },
  "Paneer Biryani": { calories: 410, protein: 14, carbs: 54, fat: 15, serving: "1 Plate" },
  Biryani: { calories: 420, protein: 20, carbs: 56, fat: 14, serving: "1 Plate" },
  Appam: { calories: 120, protein: 2, carbs: 22, fat: 2, serving: "1 Appam" },
  "Boiled Egg": { calories: 78, protein: 6, carbs: 0.6, fat: 5, serving: "1 Egg" },
  "Chicken 65": { calories: 280, protein: 24, carbs: 8, fat: 16, serving: "1 Plate" },
  "Butter Chicken": { calories: 380, protein: 28, carbs: 12, fat: 24, serving: "1 Bowl" },
  "Chicken Tikka": { calories: 260, protein: 32, carbs: 5, fat: 12, serving: "1 Plate" },
  "Paneer Butter Masala": { calories: 340, protein: 12, carbs: 14, fat: 26, serving: "1 Bowl" },
  "Palak Paneer": { calories: 280, protein: 14, carbs: 10, fat: 20, serving: "1 Bowl" },
  "Kadai Paneer": { calories: 310, protein: 13, carbs: 12, fat: 23, serving: "1 Bowl" },
  "Aloo Gobi": { calories: 180, protein: 4, carbs: 24, fat: 8, serving: "1 Bowl" },
  "Aloo Matar": { calories: 195, protein: 5, carbs: 26, fat: 8, serving: "1 Bowl" },
  "Bhindi Masala": { calories: 150, protein: 3, carbs: 18, fat: 8, serving: "1 Bowl" },
  "Chana Masala": { calories: 240, protein: 11, carbs: 36, fat: 6, serving: "1 Bowl" },
  Rajma: { calories: 250, protein: 12, carbs: 38, fat: 6, serving: "1 Bowl" },
  "Dal Makhani": { calories: 260, protein: 10, carbs: 26, fat: 12, serving: "1 Bowl" },
  "Dal Tadka": { calories: 180, protein: 9, carbs: 24, fat: 5, serving: "1 Bowl" },
  Dal: { calories: 170, protein: 9, carbs: 24, fat: 4, serving: "1 Bowl" },
  Sambar: { calories: 130, protein: 5, carbs: 20, fat: 3, serving: "1 Bowl" },
  Rasam: { calories: 65, protein: 2, carbs: 10, fat: 1.5, serving: "1 Bowl" },
  Chapati: { calories: 104, protein: 3, carbs: 18, fat: 2, serving: "1 Chapati" },
  Roti: { calories: 100, protein: 3, carbs: 18, fat: 2, serving: "1 Roti" },
  Paratha: { calories: 260, protein: 6, carbs: 34, fat: 11, serving: "1 Paratha" },
  Puri: { calories: 125, protein: 2, carbs: 14, fat: 7, serving: "1 Puri" },
  Bhatura: { calories: 210, protein: 5, carbs: 26, fat: 10, serving: "1 Piece" },
  Naan: { calories: 260, protein: 8, carbs: 45, fat: 5, serving: "1 Naan" },
  "Lemon Rice": { calories: 280, protein: 5, carbs: 46, fat: 9, serving: "1 Plate" },
  "Curd Rice": { calories: 240, protein: 6, carbs: 36, fat: 8, serving: "1 Bowl" },
  Rice: { calories: 206, protein: 4, carbs: 45, fat: 0.4, serving: "1 Cup" },
  Poha: { calories: 220, protein: 4, carbs: 34, fat: 8, serving: "1 Bowl" },
  Vada: { calories: 140, protein: 4, carbs: 16, fat: 7, serving: "1 Vada" },
  "Gulab Jamun": { calories: 280, protein: 4, carbs: 48, fat: 9, serving: "2 Pieces" },
  Jalebi: { calories: 300, protein: 2, carbs: 58, fat: 8, serving: "3 Pieces" },
  Lassi: { calories: 180, protein: 6, carbs: 26, fat: 6, serving: "1 Glass" },
  Sweets: { calories: 260, protein: 4, carbs: 46, fat: 8, serving: "1 Serving" },
};

// ==========================================
// 2. Helper Functions
// ==========================================

export function formatFoodName(label: string): string {
  if (!label) return "Recognized Food";
  const clean = label.replace(/_/g, " ").trim();
  const lower = clean.toLowerCase();

  if (lower === "idly") return "Idli";
  if (lower === "ven pongal") return "Ven Pongal";
  if (lower === "chicken briyani") return "Chicken Biryani";
  if (lower === "mutton briyani") return "Mutton Biryani";
  if (lower === "paneer briyani") return "Paneer Biryani";
  if (lower === "mushroom briyani") return "Mushroom Biryani";
  if (lower === "veg briyani") return "Veg Biryani";
  if (lower === "panner masala") return "Paneer Masala";
  if (lower === "sambar satham") return "Sambar Satham";
  if (lower === "parupu vada") return "Vada";
  if (lower === "uzhuntha vadai") return "Vada";
  if (lower === "satham") return "Rice";
  if (lower === "nei satham") return "Ghee Rice";

  return clean
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function lookupBaseNutrition(foodName: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
} {
  const direct = NUTRITION_DATABASE[foodName];
  if (direct) return direct;

  const lower = foodName.toLowerCase();
  for (const [key, val] of Object.entries(NUTRITION_DATABASE)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return val;
    }
  }

  // Broad category heuristics for 111-class Indian dishes
  if (lower.includes("biryani") || lower.includes("briyani") || lower.includes("pulav")) {
    return { calories: 420, protein: 18, carbs: 56, fat: 14, serving: "1 Plate" };
  }
  if (lower.includes("dosa")) {
    return { calories: 220, protein: 5, carbs: 34, fat: 7, serving: "1 Dosa" };
  }
  if (lower.includes("idli") || lower.includes("idly")) {
    return { calories: 58, protein: 2, carbs: 12, fat: 0.4, serving: "1 Idli" };
  }
  if (lower.includes("paneer")) {
    return { calories: 320, protein: 13, carbs: 12, fat: 24, serving: "1 Bowl" };
  }
  if (
    lower.includes("chicken") ||
    lower.includes("mutton") ||
    lower.includes("fish") ||
    lower.includes("prawn")
  ) {
    return { calories: 310, protein: 26, carbs: 8, fat: 18, serving: "1 Bowl" };
  }
  if (
    lower.includes("dal") ||
    lower.includes("daal") ||
    lower.includes("chana") ||
    lower.includes("chole") ||
    lower.includes("rajma")
  ) {
    return { calories: 220, protein: 10, carbs: 32, fat: 6, serving: "1 Bowl" };
  }
  if (
    lower.includes("roti") ||
    lower.includes("chapati") ||
    lower.includes("naan") ||
    lower.includes("paratha")
  ) {
    return { calories: 150, protein: 4, carbs: 24, fat: 4, serving: "1 Piece" };
  }
  if (
    lower.includes("halwa") ||
    lower.includes("laddu") ||
    lower.includes("jamun") ||
    lower.includes("kheer") ||
    lower.includes("sweet") ||
    lower.includes("jalebi")
  ) {
    return { calories: 260, protein: 4, carbs: 48, fat: 8, serving: "1 Serving" };
  }

  return { calories: 210, protein: 5, carbs: 35, fat: 6, serving: "1 Serving" };
}

export const DEFAULT_FLASK_API_URL = "http://192.168.1.4:5000/predict";

export function getEffectiveApiEndpoint(): string {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("healthdrift_food_api_url");
    if (override && override.trim().length > 0) {
      return override.trim();
    }
  }

  const envUrl = import.meta.env.VITE_FOOD_RECOGNITION_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  // On physical Android device (Capacitor native), default directly to laptop LAN Flask URL
  if (
    typeof window !== "undefined" &&
    (
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.()
  ) {
    return DEFAULT_FLASK_API_URL;
  }

  // If in web browser on localhost or local network, default to laptop LAN Flask URL
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."))
  ) {
    return DEFAULT_FLASK_API_URL;
  }

  return "/api/predict";
}

async function prepareImageForUpload(file: File): Promise<File> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const safeName = file.name
                ? file.name.replace(/\.[^/.]+$/, ".jpg")
                : "food-camera-capture.jpg";
              resolve(new File([blob], safeName, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.92,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 19) return "Evening Snack";
  return "Dinner";
}

// ==========================================
// 3. Main Food Dashboard Component
// ==========================================

export function FoodDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.uid ?? "";

  // Dashboard Data State
  const [mealEntries, setMealEntries] = React.useState<MealEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);
  const [activeHistoryTab, setActiveHistoryTab] = React.useState<"today" | "week" | "all">("today");

  // Daily totals
  const [totalToday, setTotalToday] = React.useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealCount: 0,
  });

  // Daily target goals (standard balanced metabolic baseline)
  const dailyGoals = {
    calories: 2000,
    protein: 70,
    carbs: 250,
    fat: 60,
  };

  // Scanner & Modal State
  const [isScanModalOpen, setIsScanModalOpen] = React.useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [activeCaptureMode, setActiveCaptureMode] = React.useState<"upload" | "camera">("upload");

  // Recognition Form State
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [predictionResult, setPredictionResult] = React.useState<PredictionResponse | null>(null);

  // Editable nutrition & meal form
  const [editFoodName, setEditFoodName] = React.useState("");
  const [editServingQty, setEditServingQty] = React.useState<number>(1);
  const [editServingSize, setEditServingSize] = React.useState("1 Serving");
  const [editCalories, setEditCalories] = React.useState<number>(0);
  const [editProtein, setEditProtein] = React.useState<number>(0);
  const [editCarbs, setEditCarbs] = React.useState<number>(0);
  const [editFat, setEditFat] = React.useState<number>(0);
  const [selectedMealType, setSelectedMealType] = React.useState<MealType>(getDefaultMealType());
  const [isSavingMeal, setIsSavingMeal] = React.useState(false);

  // Live Camera Viewfinder State
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Settings / Diagnostics State
  const [customApiUrl, setCustomApiUrl] = React.useState("");
  const [testStatus, setTestStatus] = React.useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Native input refs
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraDeviceInputRef = React.useRef<HTMLInputElement | null>(null);

  // ==========================================
  // 4. Firestore Data Fetching & Sync
  // ==========================================

  const loadFoodLogs = React.useCallback(async () => {
    if (!userId) {
      setIsLoadingLogs(false);
      return;
    }
    try {
      setIsLoadingLogs(true);
      const entriesRef = collection(db, "food_logs", userId, "entries");
      const q = query(entriesRef, orderBy("timestamp", "desc"), limit(120));
      const snap = await getDocs(q);

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const loaded: MealEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid || userId,
          foodName: data.foodName || "Meal",
          servingSize: data.servingSize || "1 Serving",
          servingQty: Number(data.servingQty || 1),
          calories: Number(data.calories || 0),
          protein: Number(data.protein || 0),
          carbs: Number(data.carbs || 0),
          fat: Number(data.fat || 0),
          mealType: (data.mealType as MealType) || "Lunch",
          confidence: data.confidence !== undefined ? Number(data.confidence) : undefined,
          date: data.date || todayStr,
          timestamp: data.timestamp || null,
        };
      });

      setMealEntries(loaded);

      // Compute today's totals
      const todayEntries = loaded.filter((entry) => {
        if (entry.date === todayStr) return true;
        const entryDate = entry.timestamp?.toDate?.();
        return entryDate && format(entryDate, "yyyy-MM-dd") === todayStr;
      });

      const totals = todayEntries.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
          mealCount: acc.mealCount + 1,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
      );

      setTotalToday(totals);
    } catch (err) {
      console.error("Failed to load food logs:", err);
      toast.error("Could not load food entries from Firebase.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void loadFoodLogs();
  }, [loadFoodLogs]);

  // Load custom API URL setting from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomApiUrl(getEffectiveApiEndpoint());
    }
  }, []);

  // Cleanup camera stream on unmount
  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ==========================================
  // 5. Camera Management
  // ==========================================

  const startInAppCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Live browser camera is unavailable. Use 'Launch Native Camera' instead.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to access camera.";
      setCameraError(msg);
      toast.error(msg);
      setIsCameraActive(false);
    }
  };

  const stopInAppCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  };

  const captureFromInAppCamera = async () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context.");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setImagePreviewUrl(dataUrl);

      const blob = await fetch(dataUrl).then((r) => r.blob());
      const capturedFile = new File([blob], "food-camera-capture.jpg", { type: "image/jpeg" });
      setImageFile(capturedFile);

      stopInAppCamera();
      void runFoodRecognition(capturedFile);
    } catch (err) {
      console.error("Camera capture failed:", err);
      toast.error("Could not capture image from camera.");
    }
  };

  // Handle image selected via gallery or native Android camera intent
  const handleImageSelected = (file: File) => {
    setImageFile(file);
    setAnalysisError(null);
    setPredictionResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviewUrl(String(e.target?.result));
    };
    reader.readAsDataURL(file);

    void runFoodRecognition(file);
  };

  // ==========================================
  // 6. Food Recognition Engine (Flask API)
  // ==========================================

  const runFoodRecognition = async (fileToAnalyze: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    const endpoint = getEffectiveApiEndpoint();
    const urlsToTry = [endpoint];

    // Always include direct laptop LAN URL as candidate if not already primary
    if (endpoint !== DEFAULT_FLASK_API_URL && !urlsToTry.includes(DEFAULT_FLASK_API_URL)) {
      urlsToTry.push(DEFAULT_FLASK_API_URL);
    }

    // In web browser, also try same-origin proxy
    if (!urlsToTry.includes("/api/predict") && typeof window !== "undefined") {
      urlsToTry.push("/api/predict");
    }

    let lastError: Error | null = null;
    let data: PredictionResponse | null = null;

    // Scale/convert image to pristine JPEG under 1024px before sending
    const uploadFile = await prepareImageForUpload(fileToAnalyze);

    for (const url of urlsToTry) {
      try {
        const formData = new FormData();
        formData.append("image", uploadFile, uploadFile.name || "food-image.jpg");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

        const response = await fetch(url, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorDetail = "";
          try {
            const errJson = await response.json();
            if (errJson && typeof errJson === "object") {
              const stageMsg = errJson.stage ? ` [Stage: ${errJson.stage}]` : "";
              const mainMsg = errJson.error || errJson.message || "";
              const typeMsg = errJson.error_type ? ` (${errJson.error_type})` : "";
              errorDetail = `${mainMsg}${stageMsg}${typeMsg}`;
            }
          } catch {
            const raw = await response.text().catch(() => "");
            const stripped = raw
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            errorDetail = stripped.slice(0, 200);
          }

          const fallbackText = response.statusText ? ` (${response.statusText})` : "";
          const finalError =
            errorDetail && errorDetail.length > 0
              ? `Flask server returned HTTP ${response.status}: ${errorDetail}`
              : `Flask server returned HTTP ${response.status}${fallbackText}.`;
          throw new Error(finalError);
        }

        const json = (await response.json()) as PredictionResponse;
        if (typeof json.predicted_food === "string" && typeof json.confidence === "number") {
          data = {
            ...json,
            confidence: json.confidence > 1 ? json.confidence / 100 : json.confidence,
          };
          break;
        } else {
          throw new Error(
            "Invalid response format: 'predicted_food' and 'confidence' are required.",
          );
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    setIsAnalyzing(false);

    if (!data) {
      const isNetworkFail =
        lastError?.name === "AbortError" ||
        lastError?.message.includes("Failed to fetch") ||
        lastError?.message.includes("NetworkError") ||
        lastError?.message.includes("502");

      const failureMessage = isNetworkFail
        ? `Could not reach the Flask recognition API at ${urlsToTry.join(" or ")}. Make sure 'python backend/app.py' is running on port 5000, or click Settings to configure your LAN IP.`
        : lastError?.message || "Food recognition request failed.";

      setAnalysisError(failureMessage);
      toast.error("Food recognition failed. You can retry or enter nutrition manually.");
      return;
    }

    // Success: Populate editable nutrition form
    setPredictionResult(data);
    const formattedTitle = formatFoodName(data.predicted_food);
    const baseNutr = lookupBaseNutrition(formattedTitle);

    setEditFoodName(formattedTitle);
    setEditServingQty(1);
    setEditServingSize(baseNutr.serving);
    setEditCalories(baseNutr.calories);
    setEditProtein(baseNutr.protein);
    setEditCarbs(baseNutr.carbs);
    setEditFat(baseNutr.fat);

    toast.success(
      `Recognized: ${formattedTitle} (${Math.round(data.confidence * 100)}% confidence)`,
    );
  };

  // When user clicks a top-5 alternative prediction chip
  const handleSelectAlternativePrediction = (altName: string, altConfidence: number) => {
    const formatted = formatFoodName(altName);
    const baseNutr = lookupBaseNutrition(formatted);

    setEditFoodName(formatted);
    setEditServingQty(1);
    setEditServingSize(baseNutr.serving);
    setEditCalories(baseNutr.calories);
    setEditProtein(baseNutr.protein);
    setEditCarbs(baseNutr.carbs);
    setEditFat(baseNutr.fat);

    if (predictionResult) {
      setPredictionResult({
        ...predictionResult,
        predicted_food: altName,
        confidence: altConfidence,
      });
    }

    toast.info(`Updated selection to: ${formatted}`);
  };

  // Update calories and macros when serving quantity changes
  const handleServingQtyChange = (newQty: number) => {
    const safeQty = Math.max(0.5, Math.min(10, newQty));
    setEditServingQty(safeQty);

    const baseNutr = lookupBaseNutrition(editFoodName);
    setEditCalories(Math.round(baseNutr.calories * safeQty));
    setEditProtein(Math.round(baseNutr.protein * safeQty * 10) / 10);
    setEditCarbs(Math.round(baseNutr.carbs * safeQty * 10) / 10);
    setEditFat(Math.round(baseNutr.fat * safeQty * 10) / 10);
  };

  // ==========================================
  // 7. Meal Saving to Firebase
  // ==========================================

  const handleSaveMeal = async () => {
    if (!userId) {
      toast.error("User session not found. Please log in.");
      return;
    }
    if (!editFoodName.trim()) {
      toast.error("Please enter a valid food name.");
      return;
    }
    if (isSavingMeal) return;

    setIsSavingMeal(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const entryRef = doc(collection(db, "food_logs", userId, "entries"));

      const mealPayload = {
        uid: userId,
        foodName: editFoodName.trim(),
        servingSize: editServingSize.trim() || "1 Serving",
        servingQty: Number(editServingQty) || 1,
        calories: Number(editCalories) || 0,
        protein: Number(editProtein) || 0,
        carbs: Number(editCarbs) || 0,
        fat: Number(editFat) || 0,
        mealType: selectedMealType,
        confidence: predictionResult?.confidence ?? null,
        date: todayStr,
        timestamp: serverTimestamp(),
      };

      await setDoc(entryRef, mealPayload);

      // Local optimistic update to immediately reflect in today's breakdown
      const newEntry: MealEntry = {
        ...mealPayload,
        id: entryRef.id,
        timestamp: null,
      };

      setMealEntries((prev) => [newEntry, ...prev]);
      setTotalToday((prev) => ({
        calories: prev.calories + newEntry.calories,
        protein: prev.protein + newEntry.protein,
        carbs: prev.carbs + newEntry.carbs,
        fat: prev.fat + newEntry.fat,
        mealCount: prev.mealCount + 1,
      }));

      toast.success(`Logged ${newEntry.foodName} to ${selectedMealType}!`);

      // Reset modal state
      setIsScanModalOpen(false);
      setImageFile(null);
      setImagePreviewUrl(null);
      setPredictionResult(null);
      setAnalysisError(null);
    } catch (err) {
      console.error("Failed to save meal entry:", err);
      toast.error("Failed to save meal to Firebase.");
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (
    entryId: string,
    itemCalories: number,
    itemProtein: number,
    itemCarbs: number,
    itemFat: number,
    itemDate: string,
  ) => {
    if (!userId || !entryId) return;
    try {
      await deleteDoc(doc(db, "food_logs", userId, "entries", entryId));
      setMealEntries((prev) => prev.filter((item) => item.id !== entryId));

      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (itemDate === todayStr) {
        setTotalToday((prev) => ({
          calories: Math.max(0, prev.calories - itemCalories),
          protein: Math.max(0, prev.protein - itemProtein),
          carbs: Math.max(0, prev.carbs - itemCarbs),
          fat: Math.max(0, prev.fat - itemFat),
          mealCount: Math.max(0, prev.mealCount - 1),
        }));
      }

      toast.success("Meal entry removed.");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Could not delete meal entry.");
    }
  };

  // ==========================================
  // 8. Backend Health Check Tester
  // ==========================================

  const testBackendConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const endpoint = customApiUrl.trim() || getEffectiveApiEndpoint();
      // Derive status check URL (replace /predict with / or check endpoint directly)
      const baseStatusUrl = endpoint.endsWith("/predict")
        ? endpoint.replace(/\/predict$/, "/")
        : endpoint;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(baseStatusUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const body = (await res.json().catch(() => null)) as {
          status?: string;
          num_classes?: number;
        } | null;
        const classes = body?.num_classes || 111;
        setTestStatus({
          loading: false,
          success: true,
          message: `Connected successfully! Flask backend is online with ${classes} food classes loaded.`,
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: `Server reached but returned HTTP status ${res.status}. Check backend logs.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setTestStatus({
        loading: false,
        success: false,
        message: `Connection failed: ${msg}. If using a physical phone, verify both devices are on the same Wi-Fi and use your laptop's LAN IP.`,
      });
    }
  };

  const handleSaveCustomEndpoint = () => {
    if (typeof window !== "undefined") {
      const clean = customApiUrl.trim();
      if (clean) {
        localStorage.setItem("healthdrift_food_api_url", clean);
        toast.success(`API endpoint set to: ${clean}`);
      } else {
        localStorage.removeItem("healthdrift_food_api_url");
        toast.info("Reset to default automatic endpoint.");
      }
    }
    setIsSettingsModalOpen(false);
  };

  // Filter history entries by tab
  const filteredHistory = React.useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (activeHistoryTab === "today") {
      return mealEntries.filter((m) => m.date === todayStr);
    }
    if (activeHistoryTab === "week") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return mealEntries.filter((m) => {
        if (!m.timestamp) return m.date === todayStr;
        const entryDate = m.timestamp.toDate();
        return entryDate >= sevenDaysAgo;
      });
    }
    return mealEntries;
  }, [mealEntries, activeHistoryTab]);

  // Today's meal slot groupings
  const todayMealsByType = React.useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayItems = mealEntries.filter((m) => m.date === todayStr);

    return {
      Breakfast: todayItems.filter((m) => m.mealType === "Breakfast"),
      Lunch: todayItems.filter((m) => m.mealType === "Lunch"),
      "Evening Snack": todayItems.filter((m) => m.mealType === "Evening Snack"),
      Dinner: todayItems.filter((m) => m.mealType === "Dinner"),
    };
  }, [mealEntries]);

  // Macro progress percentages
  const caloriePercent = Math.min(
    100,
    Math.round((totalToday.calories / dailyGoals.calories) * 100),
  );
  const proteinPercent = Math.min(100, Math.round((totalToday.protein / dailyGoals.protein) * 100));
  const carbsPercent = Math.min(100, Math.round((totalToday.carbs / dailyGoals.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((totalToday.fat / dailyGoals.fat) * 100));

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 overflow-x-hidden">
      {/* Background Ambience */}
      <AuroraBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* ==========================================
            Top Navigation & Title Header
        ========================================== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Back to Main Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-6 h-6 text-cyan" />
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
                  Food & Nutrition Intelligence
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                AI Indian food recognition via MobileNetV3Small & daily metabolic tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Backend Settings Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomApiUrl(getEffectiveApiEndpoint());
                setIsSettingsModalOpen(true);
              }}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-xs gap-1.5 h-10 px-3.5"
            >
              <Server className="w-3.5 h-3.5 text-cyan" />
              <span className="hidden sm:inline">Flask API:</span>
              <span className="font-mono text-cyan truncate max-w-[130px]">
                {getEffectiveApiEndpoint().replace("http://", "")}
              </span>
              <Settings className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
            </Button>

            {/* Scan New Meal CTA */}
            <GlowButton
              onClick={() => {
                setImageFile(null);
                setImagePreviewUrl(null);
                setPredictionResult(null);
                setAnalysisError(null);
                setSelectedMealType(getDefaultMealType());
                setIsScanModalOpen(true);
              }}
              className="h-10 px-5 text-sm"
            >
              <Camera className="w-4 h-4" />
              Scan New Meal
            </GlowButton>
          </div>
        </div>

        {/* ==========================================
            Section 1: Today's Nutrition Summary Cards
        ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Calorie Summary Card */}
          <GlassCard glow="cyan" className="lg:col-span-1 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Calories Consumed</span>
                <span className="flex items-center gap-1 text-xs text-cyan font-mono">
                  <Flame className="w-3.5 h-3.5 text-cyan animate-pulse" />
                  Target: {dailyGoals.calories}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight">
                  {totalToday.calories}
                </span>
                <span className="text-sm font-medium text-muted-foreground">kcal</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-black/40 h-2.5 rounded-full mt-4 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all duration-700"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                <span>{caloriePercent}% of daily budget</span>
                <span>{Math.max(0, dailyGoals.calories - totalToday.calories)} kcal remaining</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meals Logged Today</span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan/15 text-cyan font-semibold border border-cyan/30">
                {totalToday.mealCount} {totalToday.mealCount === 1 ? "meal" : "meals"}
              </span>
            </div>
          </GlassCard>

          {/* Macronutrient Cards (3 Cards) */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Protein */}
            <GlassCard className="p-5 flex flex-col justify-between border-cyan/20 bg-cyan/5">
              <div>
                <div className="flex items-center justify-between text-xs text-cyan font-medium uppercase tracking-wider mb-2">
                  <span>Protein</span>
                  <span className="font-mono">
                    {Math.round(totalToday.protein)}g / {dailyGoals.protein}g
                  </span>
                </div>
                <div className="text-3xl font-display font-bold text-white">
                  {Math.round(totalToday.protein)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">g</span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full mt-3 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-cyan transition-all duration-700"
                    style={{ width: `${proteinPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-white/5">
                {proteinPercent}% target • Muscle & repair
              </p>
            </GlassCard>

            {/* Carbohydrates */}
            <GlassCard className="p-5 flex flex-col justify-between border-violet/20 bg-violet/5">
              <div>
                <div className="flex items-center justify-between text-xs text-violet font-medium uppercase tracking-wider mb-2">
                  <span>Carbohydrates</span>
                  <span className="font-mono">
                    {Math.round(totalToday.carbs)}g / {dailyGoals.carbs}g
                  </span>
                </div>
                <div className="text-3xl font-display font-bold text-white">
                  {Math.round(totalToday.carbs)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">g</span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full mt-3 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all duration-700"
                    style={{ width: `${carbsPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-white/5">
                {carbsPercent}% target • Primary energy
              </p>
            </GlassCard>

            {/* Dietary Fat */}
            <GlassCard className="p-5 flex flex-col justify-between border-blue-400/20 bg-blue-500/5">
              <div>
                <div className="flex items-center justify-between text-xs text-blue-400 font-medium uppercase tracking-wider mb-2">
                  <span>Healthy Fats</span>
                  <span className="font-mono">
                    {Math.round(totalToday.fat)}g / {dailyGoals.fat}g
                  </span>
                </div>
                <div className="text-3xl font-display font-bold text-white">
                  {Math.round(totalToday.fat)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">g</span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full mt-3 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-700"
                    style={{ width: `${fatPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-white/5">
                {fatPercent}% target • Hormone balance
              </p>
            </GlassCard>
          </div>
        </div>

        {/* ==========================================
            Section 2: Meal Schedule Breakdown (4 Slots)
        ========================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan" />
              Today's Meal Breakdown
            </h2>
            <span className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(
              [
                {
                  type: "Breakfast",
                  icon: Coffee,
                  time: "8:00 AM – 11:00 AM",
                  color: "text-amber-400",
                },
                { type: "Lunch", icon: Sun, time: "12:00 PM – 3:00 PM", color: "text-orange-400" },
                {
                  type: "Evening Snack",
                  icon: Sunset,
                  time: "4:00 PM – 6:30 PM",
                  color: "text-blue-400",
                },
                {
                  type: "Dinner",
                  icon: Moon,
                  time: "7:30 PM – 10:30 PM",
                  color: "text-purple-400",
                },
              ] as const
            ).map((slot) => {
              const meals = todayMealsByType[slot.type];
              const slotCalories = meals.reduce((sum, m) => sum + m.calories, 0);
              const SlotIcon = slot.icon;

              return (
                <GlassCard key={slot.type} className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                          <SlotIcon className={`w-4 h-4 ${slot.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-white">{slot.type}</h3>
                          <span className="text-[11px] text-muted-foreground">{slot.time}</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-white">
                        {slotCalories}{" "}
                        <span className="text-xs text-muted-foreground font-normal">kcal</span>
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 min-h-[70px]">
                      {meals.length > 0 ? (
                        meals.map((meal) => (
                          <div
                            key={meal.id}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/20 border border-white/5"
                          >
                            <span className="font-medium text-white truncate max-w-[130px]">
                              {meal.foodName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono">
                                {meal.calories} kcal
                              </span>
                              <button
                                onClick={() =>
                                  handleDeleteMeal(
                                    meal.id,
                                    meal.calories,
                                    meal.protein,
                                    meal.carbs,
                                    meal.fat,
                                    meal.date,
                                  )
                                }
                                className="text-muted-foreground hover:text-red-400 transition-colors p-0.5"
                                title="Remove meal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center py-4 text-xs text-muted-foreground italic border border-dashed border-white/10 rounded-lg">
                          No {slot.type.toLowerCase()} logged
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl(null);
                      setPredictionResult(null);
                      setAnalysisError(null);
                      setSelectedMealType(slot.type);
                      setIsScanModalOpen(true);
                    }}
                    className="w-full mt-3 h-8 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-cyan hover:text-cyan gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log {slot.type}
                  </Button>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* ==========================================
            Section 3: Meal History & Logs
        ========================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet" />
              Meal History & Nutrition Records
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveHistoryTab("today")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeHistoryTab === "today"
                    ? "bg-cyan text-black font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today (
                {mealEntries.filter((m) => m.date === format(new Date(), "yyyy-MM-dd")).length})
              </button>
              <button
                onClick={() => setActiveHistoryTab("week")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeHistoryTab === "week"
                    ? "bg-cyan text-black font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Past 7 Days
              </button>
              <button
                onClick={() => setActiveHistoryTab("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeHistoryTab === "all"
                    ? "bg-cyan text-black font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Records ({mealEntries.length})
              </button>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="grid place-items-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan" />
              <p className="text-sm">Loading meal logs from Firebase...</p>
            </div>
          ) : filteredHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((meal) => (
                <GlassCard
                  key={meal.id}
                  className="p-4 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              meal.mealType === "Breakfast"
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                : meal.mealType === "Lunch"
                                  ? "bg-orange-500/15 border-orange-500/30 text-orange-300"
                                  : meal.mealType === "Evening Snack"
                                    ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                                    : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                            }`}
                          >
                            {meal.mealType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {meal.timestamp?.toDate
                              ? format(meal.timestamp.toDate(), "h:mm a • MMM d")
                              : meal.date}
                          </span>
                        </div>
                        <h4 className="font-display font-semibold text-lg text-white mt-1">
                          {meal.foodName}
                        </h4>
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteMeal(
                            meal.id,
                            meal.calories,
                            meal.protein,
                            meal.carbs,
                            meal.fat,
                            meal.date,
                          )
                        }
                        className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title="Delete meal entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>
                        Serving:{" "}
                        <strong className="text-white">
                          {meal.servingQty}x {meal.servingSize}
                        </strong>
                      </span>
                      {meal.confidence !== undefined && (
                        <span className="text-cyan font-mono text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-cyan" />
                          {Math.round(meal.confidence * 100)}% AI Confidence
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 font-display font-bold text-base text-white">
                      <Flame className="w-4 h-4 text-cyan" />
                      {meal.calories}{" "}
                      <span className="text-xs text-muted-foreground font-normal">kcal</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <span className="text-cyan font-semibold">P: {meal.protein}g</span>
                      <span>•</span>
                      <span className="text-violet font-semibold">C: {meal.carbs}g</span>
                      <span>•</span>
                      <span className="text-blue-400 font-semibold">F: {meal.fat}g</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-white/15 rounded-2xl bg-black/20">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="font-semibold text-white">No meals logged yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Scan or upload a photo of your food to run MobileNetV3 recognition and track your
                metabolic health.
              </p>
              <Button
                onClick={() => {
                  setImageFile(null);
                  setImagePreviewUrl(null);
                  setPredictionResult(null);
                  setIsScanModalOpen(true);
                }}
                className="mt-4 bg-pulse text-primary-foreground text-xs"
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan First Meal
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          Section 4: Scan & Log Meal Modal
      ========================================== */}
      <Dialog
        open={isScanModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            stopInAppCamera();
          }
          setIsScanModalOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl bg-card border-white/15 text-white max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold flex items-center gap-2">
              <Camera className="w-6 h-6 text-cyan" />
              Scan & Recognize Meal
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              MobileNetV3Small inference on 111 Indian food categories via Flask API
            </DialogDescription>
          </DialogHeader>

          {/* Hidden HTML file inputs for Gallery and Native Android Camera */}
          <input
            type="file"
            ref={galleryInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelected(file);
            }}
          />
          <input
            type="file"
            ref={cameraDeviceInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelected(file);
            }}
          />

          <div className="space-y-6 pt-2">
            {/* Step 1: Capture / Upload Selector */}
            {!imagePreviewUrl && !isCameraActive && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={activeCaptureMode === "upload" ? "default" : "outline"}
                    onClick={() => setActiveCaptureMode("upload")}
                    className={
                      activeCaptureMode === "upload"
                        ? "bg-cyan text-black font-semibold"
                        : "border-white/10"
                    }
                  >
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Gallery Upload
                  </Button>
                  <Button
                    type="button"
                    variant={activeCaptureMode === "camera" ? "default" : "outline"}
                    onClick={() => setActiveCaptureMode("camera")}
                    className={
                      activeCaptureMode === "camera"
                        ? "bg-cyan text-black font-semibold"
                        : "border-white/10"
                    }
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Live Camera
                  </Button>
                </div>

                {activeCaptureMode === "upload" ? (
                  <div
                    onClick={() => galleryInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-cyan/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-black/20 hover:bg-black/30 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <CloudUpload className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-sm text-white">
                      Click or drag a food photo here
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports JPG, PNG, WEBP (Idli, Dosa, Biryani, Pongal, Thali, etc.)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border border-white/15 rounded-2xl p-6 text-center bg-black/20 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Capture food image using your device camera
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          type="button"
                          onClick={startInAppCamera}
                          className="bg-cyan text-black font-semibold hover:bg-cyan/90"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Live Viewfinder
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cameraDeviceInputRef.current?.click()}
                          className="border-white/20 hover:bg-white/10"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Launch Native Camera App
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* In-App Live Camera Viewfinder */}
            {isCameraActive && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/20">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-cyan/40 m-6 rounded-xl flex items-center justify-center">
                    <span className="bg-black/60 px-3 py-1 rounded-full text-xs text-cyan font-mono border border-cyan/30">
                      Center food item in frame
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={captureFromInAppCamera}
                    className="flex-1 bg-cyan text-black font-bold h-11"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Snap Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopInAppCamera}
                    className="border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Image Preview & Processing State */}
            {imagePreviewUrl && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 aspect-video bg-black/40">
                  <img
                    src={imagePreviewUrl}
                    alt="Captured meal"
                    className="w-full h-full object-contain"
                  />

                  {/* Top-right Retake button */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl(null);
                        setPredictionResult(null);
                        setAnalysisError(null);
                        galleryInputRef.current?.click();
                      }}
                      className="bg-black/70 hover:bg-black/90 text-white text-xs backdrop-blur-md border border-white/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Change Photo
                    </Button>
                  </div>

                  {/* Recognition loading overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm grid place-items-center p-6 text-center">
                      <div className="space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan mx-auto" />
                        <h4 className="font-semibold text-white">Classifying Food Image...</h4>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Sending image to MobileNetV3Small Flask backend on port 5000...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis Error Display */}
                {analysisError && (
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-sm text-red-300">
                          Backend Recognition Unavailable
                        </h5>
                        <p className="text-xs text-red-200/80 mt-1">{analysisError}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-red-500/20">
                      <Button
                        size="sm"
                        onClick={() => imageFile && runFoodRecognition(imageFile)}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs h-8"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Retry Recognition
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCustomApiUrl(getEffectiveApiEndpoint());
                          setIsSettingsModalOpen(true);
                        }}
                        className="border-red-400/30 text-white text-xs h-8"
                      >
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Configure Flask URL
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAnalysisError(null);
                          setEditFoodName("Manual Food Entry");
                          setEditServingQty(1);
                          setEditCalories(250);
                          setEditProtein(8);
                          setEditCarbs(35);
                          setEditFat(6);
                        }}
                        className="text-xs text-muted-foreground hover:text-white h-8"
                      >
                        Enter Manually Instead
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Recognition Result & Alternative Predictions */}
                {predictionResult && (
                  <div className="p-4 rounded-xl border border-cyan/30 bg-cyan/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-cyan" />
                        <div>
                          <span className="text-xs text-muted-foreground">
                            MobileNetV3Small Prediction
                          </span>
                          <h4 className="font-display font-bold text-lg text-white">
                            {formatFoodName(predictionResult.predicted_food)}
                          </h4>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-cyan/20 border border-cyan/40 text-cyan text-xs font-mono font-bold">
                        {Math.round(predictionResult.confidence * 100)}% Confidence
                      </span>
                    </div>

                    {/* Top 5 Alternatives */}
                    {predictionResult.top_5_predictions &&
                      predictionResult.top_5_predictions.length > 1 && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-[11px] text-muted-foreground block mb-1.5">
                            Alternative classifications (click to switch):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {predictionResult.top_5_predictions.slice(1).map((alt) => (
                              <button
                                key={alt.food_name}
                                type="button"
                                onClick={() =>
                                  handleSelectAlternativePrediction(alt.food_name, alt.confidence)
                                }
                                className="px-2.5 py-1 rounded-md bg-black/40 hover:bg-cyan/15 border border-white/10 hover:border-cyan/30 text-[11px] text-muted-foreground hover:text-cyan transition-colors"
                              >
                                {formatFoodName(alt.food_name)} ({Math.round(alt.confidence * 100)}
                                %)
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Step 4: Editable Nutrition & Serving Form */}
                {(predictionResult || editFoodName) && (
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-cyan" />
                        Verify & Edit Nutrition
                      </span>
                      <span>Default serving quantity: 1</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Food Name input */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Food Item Name</Label>
                        <Input
                          type="text"
                          value={editFoodName}
                          onChange={(e) => setEditFoodName(e.target.value)}
                          className="bg-black/30 border-white/15 text-white h-9 mt-1"
                        />
                      </div>

                      {/* Serving Quantity Stepper */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Serving Quantity</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleServingQtyChange(editServingQty - 1)}
                            disabled={editServingQty <= 0.5}
                            className="h-9 w-9 p-0 border-white/15"
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="10"
                            value={editServingQty}
                            onChange={(e) =>
                              handleServingQtyChange(parseFloat(e.target.value) || 1)
                            }
                            className="bg-black/30 border-white/15 text-center text-white font-mono h-9"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleServingQtyChange(editServingQty + 1)}
                            className="h-9 w-9 p-0 border-white/15"
                          >
                            +
                          </Button>
                          <Input
                            type="text"
                            value={editServingSize}
                            onChange={(e) => setEditServingSize(e.target.value)}
                            className="bg-black/30 border-white/15 text-xs text-muted-foreground h-9 max-w-[110px]"
                            placeholder="Unit (e.g. 1 Bowl)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Calorie and Macro Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs text-cyan">Calories (kcal)</Label>
                        <Input
                          type="number"
                          value={editCalories}
                          onChange={(e) => setEditCalories(parseInt(e.target.value) || 0)}
                          className="bg-black/30 border-cyan/30 text-white font-mono h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-cyan">Protein (g)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editProtein}
                          onChange={(e) => setEditProtein(parseFloat(e.target.value) || 0)}
                          className="bg-black/30 border-white/15 text-white font-mono h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-violet">Carbs (g)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editCarbs}
                          onChange={(e) => setEditCarbs(parseFloat(e.target.value) || 0)}
                          className="bg-black/30 border-white/15 text-white font-mono h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-blue-400">Fat (g)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editFat}
                          onChange={(e) => setEditFat(parseFloat(e.target.value) || 0)}
                          className="bg-black/30 border-white/15 text-white font-mono h-9 mt-1"
                        />
                      </div>
                    </div>

                    {/* Step 5: Meal Type Selector */}
                    <div>
                      <Label className="text-xs text-muted-foreground block mb-1.5">
                        Assign to Meal Slot
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(["Breakfast", "Lunch", "Evening Snack", "Dinner"] as const).map(
                          (mType) => (
                            <button
                              key={mType}
                              type="button"
                              onClick={() => setSelectedMealType(mType)}
                              className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                                selectedMealType === mType
                                  ? "bg-cyan/20 border-cyan text-white shadow-sm"
                                  : "bg-black/20 border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"
                              }`}
                            >
                              {mType}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Step 6: Save Action */}
                    <div className="pt-3 flex gap-3">
                      <Button
                        type="button"
                        onClick={handleSaveMeal}
                        disabled={isSavingMeal || !editFoodName.trim()}
                        className="flex-1 bg-pulse text-primary-foreground font-semibold h-11"
                      >
                        {isSavingMeal ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving to Firebase...
                          </>
                        ) : (
                          <>
                            <UtensilsCrossed className="w-4 h-4 mr-2" />
                            Save {selectedMealType} Log
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsScanModalOpen(false)}
                        className="border-white/15"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          Section 5: API & Backend Diagnostics Modal
      ========================================== */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-md bg-card border-white/15 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan" />
              Flask Backend Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the connection to MobileNetV3Small running in your local Flask backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Active Prediction Endpoint</Label>
              <Input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder="/api/predict or http://192.168.1.45:5000/predict"
                className="bg-black/30 border-white/15 text-white font-mono text-xs h-9 mt-1"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Leave blank or set to <code>/api/predict</code> to use the automatic internal proxy.
              </span>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] font-semibold text-white block mb-1.5">
                Quick Endpoint Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setCustomApiUrl("/api/predict")}
                  className="text-xs h-7 border-white/10"
                >
                  Proxy (/api/predict)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setCustomApiUrl("http://127.0.0.1:5000/predict")}
                  className="text-xs h-7 border-white/10"
                >
                  Localhost (127.0.0.1)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setCustomApiUrl("http://10.0.2.2:5000/predict")}
                  className="text-xs h-7 border-white/10"
                >
                  Android Emulator
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setCustomApiUrl("http://192.168.1.4:5000/predict")}
                  className="text-xs h-7 border-cyan/40 text-cyan bg-cyan/10 hover:bg-cyan/20"
                >
                  Samsung LAN (192.168.1.4)
                </Button>
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="p-3 rounded-xl border border-white/10 bg-black/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Connection Verification</span>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={testStatus.loading}
                  onClick={testBackendConnection}
                  className="h-7 text-xs border-cyan/40 text-cyan hover:bg-cyan/10"
                >
                  {testStatus.loading ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Test Connection
                </Button>
              </div>

              {testStatus.message && (
                <p
                  className={`text-xs p-2 rounded-lg border ${
                    testStatus.success
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {testStatus.message}
                </p>
              )}
            </div>

            {/* Android Cleartext & LAN Guide */}
            <div className="p-3 rounded-xl border border-white/5 bg-white/5 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-white">Testing from physical Android device?</p>
              <p>1. Ensure your phone and laptop are on the same Wi-Fi.</p>
              <p>
                2. Set the endpoint to your laptop's Wi-Fi IP (e.g.{" "}
                <code>http://192.168.x.x:5000/predict</code>).
              </p>
              <p>
                3. Run <code>python backend/app.py</code> with <code>host="0.0.0.0"</code>.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSaveCustomEndpoint}
                className="flex-1 bg-cyan text-black font-semibold h-9 text-xs"
              >
                Save & Apply Endpoint
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettingsModalOpen(false)}
                className="h-9 text-xs border-white/15"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
