import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import PlayerForm from "../../components/player/PlayerForm";
import type { PlayerFormData } from "../../api/playerService/playerService";
import Button from "../../components/Button";
import { playerService } from "../../api/playerService/playerService";
import api from "../../api/axios";
import { useAuth } from "../../auth/useAuth";
import { getAdminBranches, type Branch } from "../../api/branch.api";

type FeePlanOption = {
  publicId: string;
  name: string;
  amount: number;
  discountAmount: number;
  durationLabel: string;
};

function RegisterPlayer() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === "ROLE_SUPER_ADMIN";

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedPlayerName, setSavedPlayerName] = useState("");
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );

  // Fee plan states
  const [feePlans, setFeePlans] = useState<FeePlanOption[]>([]);
  const [selectedFeePlan, setSelectedFeePlan] = useState("");

  // Branch states — only used for super admin
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [formData, setFormData] = useState<PlayerFormData>({
    displayName: "",
    kscaId: "",
    dob: "",
    fatherName: "",
    motherName: "",
    address: "",
    phone: "",
    parentsPhone: "",
    email: "",
    aadharNumber: "",
    gender: "",
    profession: "",
    batchIds: [],
    schoolOrCollege: "",
    skillLevel: "",
    battingStyle: "",
    bowlingStyle: "",
    previousRepresentation: "",
    joiningDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // Load fee plans
  useEffect(() => {
    api
      .get("/admin/fees/plans/active")
      .then((res) => setFeePlans(res.data))
      .catch(() => setFeePlans([]));
  }, []);

  // Load branches — only for super admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    getAdminBranches()
      .then((data) => setBranches(data))
      .catch(() => setBranches([]));
  }, [isSuperAdmin]);

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.95);
    });
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (invalidFields[name]) {
      setInvalidFields((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview("");
      setTempPhotoUrl("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error("Only JPG, PNG, and WebP images are supported");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPhotoUrl(reader.result as string);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = async () => {
    if (!croppedAreaPixels || !tempPhotoUrl) return;

    try {
      const croppedBlob = await getCroppedImg(tempPhotoUrl, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "player-photo.jpg", {
        type: "image/jpeg",
      });

      setPhotoFile(croppedFile);
      const previewUrl = URL.createObjectURL(croppedBlob);
      setPhotoPreview(previewUrl);
      setShowCropper(false);
      setTempPhotoUrl("");
      toast.success("Photo cropped successfully!");
    } catch (error) {
      toast.error("Failed to crop image");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const errors: string[] = [];
    const fieldErrors: Record<string, boolean> = {};

    if (!formData.displayName?.trim()) {
      errors.push("Full Name is required");
      fieldErrors.displayName = true;
    }
    if (!formData.gender) {
      errors.push("Gender is required");
      fieldErrors.gender = true;
    }
    if (!formData.profession) {
      errors.push("Profession is required");
      fieldErrors.profession = true;
    }
    if (!formData.dob) {
      errors.push("Date of Birth is required");
      fieldErrors.dob = true;
    } else if (new Date(formData.dob) > new Date()) {
      errors.push("Date of Birth cannot be in the future");
      fieldErrors.dob = true;
    }
    if (!formData.address?.trim()) {
      errors.push("Address is required");
      fieldErrors.address = true;
    }
    if (!formData.email?.trim()) {
      errors.push("Email is required");
      fieldErrors.email = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Invalid email format");
      fieldErrors.email = true;
    }
    if (!formData.parentsPhone?.trim()) {
      errors.push("Parent Phone is required");
      fieldErrors.parentsPhone = true;
    } else if (!/^[6-9]\d{9}$/.test(formData.parentsPhone)) {
      errors.push("Invalid Parent Phone number");
      fieldErrors.parentsPhone = true;
    }
    if (batchIds.length === 0) {
      errors.push("At least one batch must be selected");
      fieldErrors.batchIds = true;
    }

    // Branch required for super admin
    if (isSuperAdmin && !selectedBranchId) {
      errors.push("Branch is required");
      fieldErrors.branchId = true;
    }

    // Email uniqueness check
    if (formData.email && !fieldErrors.email) {
      try {
        const emailExists = await playerService.checkEmailExists(
          formData.email,
        );
        if (emailExists) {
          errors.push("Email already exists. Please use a different email.");
          fieldErrors.email = true;
        }
      } catch (err) {
        console.error("Email check failed:", err);
      }
    }

    if (errors.length > 0) {
      setInvalidFields(fieldErrors);
      setErrorMessage(errors.join("|"));
      setShowErrorDialog(true);

      const firstField = Object.keys(fieldErrors)[0];
      const element =
        firstField === "batchIds"
          ? document.getElementById("batch-section")
          : (document.querySelector(
              `[name="${firstField}"]`,
            ) as HTMLElement | null);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        if (firstField !== "batchIds") element.focus();
      }

      return;
    }

    setLoading(true);

    try {
      const { batchIds: _, ...restFormData } = formData;

      const playerData: any = {
        ...restFormData,
        batchIds,
        active: true,
        status: "ACTIVE",
      };

      // Only send branchId if super admin explicitly selected one
      if (isSuperAdmin && selectedBranchId) {
        playerData.branchId = selectedBranchId;
      }

      const result = await playerService.registerPlayer(playerData, photoFile);

      if (selectedFeePlan && result?.player?.publicId) {
        try {
          await api.post(
            `/admin/fees/accounts/assign?playerPublicId=${result.player.publicId}&feePlanPublicId=${selectedFeePlan}`,
          );
        } catch (feeErr) {
          toast.error(
            "Player registered but fee plan assignment failed. You can assign it from the Fees tab.",
          );
        }
      }

      setSavedPlayerName(formData.displayName);
      setInvalidFields({});
      setShowSuccessDialog(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Failed to register player";
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: "",
      kscaId: "",
      dob: "",
      fatherName: "",
      motherName: "",
      address: "",
      phone: "",
      parentsPhone: "",
      email: "",
      aadharNumber: "",
      gender: "",
      profession: "",
      batchIds: [],
      schoolOrCollege: "",
      skillLevel: "",
      battingStyle: "",
      bowlingStyle: "",
      previousRepresentation: "",
      joiningDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setBatchIds([]);
    setSelectedFeePlan("");
    setSelectedBranchId("");
    setPhotoFile(null);
    setPhotoPreview("");
    setTempPhotoUrl("");
    setShowCropper(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Register New Player</h1>
          <p className="text-sm text-gray-500">
            Complete the form to add a new player
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <PlayerForm
          formData={formData}
          onChange={handleChange}
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
          submitLabel="Register Player"
          loading={loading}
          onCancel={() => navigate(-1)}
          batchIds={batchIds}
          onBatchChange={setBatchIds}
          invalidFields={invalidFields}
          feePlans={feePlans}
          selectedFeePlan={selectedFeePlan}
          onFeePlanChange={setSelectedFeePlan}
          // Branch — only passed for super admin
          {...(isSuperAdmin && {
            branches,
            selectedBranchId,
            onBranchChange: setSelectedBranchId,
          })}
        />
      </form>

      {/* SUCCESS DIALOG */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Registration Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                <span className="font-semibold">{savedPlayerName}</span> has
                been registered successfully.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSuccessDialog(false);
                    resetForm();
                  }}
                >
                  Register Another
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate("/admin/players")}
                >
                  View All Players
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR DIALOG */}
      {showErrorDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Registration Failed
              </h2>
              <ul className="text-left text-red-600 mb-6 space-y-2">
                {errorMessage.split("|").map((msg, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="primary"
                onClick={() => setShowErrorDialog(false)}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CROPPER MODAL */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 md:p-6 border-b flex-shrink-0">
              <h3 className="text-lg md:text-xl font-semibold">Adjust Photo</h3>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Drag to reposition, use slider to zoom
              </p>
            </div>

            <div className="relative h-64 sm:h-80 md:h-96 bg-gray-900 flex-shrink-0">
              <Cropper
                image={tempPhotoUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{ containerStyle: { width: "100%", height: "100%" } }}
              />
            </div>

            <div className="p-4 md:p-6 space-y-4 flex-shrink-0">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Zoom
                  </label>
                  <span className="text-sm text-gray-500">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCropper(false);
                      setTempPhotoUrl("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex-1">
                  <Button type="button" variant="primary" onClick={applyCrop}>
                    Apply Crop
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterPlayer;
