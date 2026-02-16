import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import PlayerForm from "../../components/player/PlayerForm";
import type { PlayerFormData } from "../../api/playerService/playerService";

function UpdatePlayer() {
  const navigate = useNavigate();
  const { playerPublicId } = useParams();

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [batchIds, setBatchIds] = useState<string[]>([]);

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
    joiningDate: "",
    notes: "",
  });

  // Load existing player data
  useEffect(() => {
    if (!playerPublicId) return;

    api
      .get(`/admin/players/${playerPublicId}/info`)
      .then((res) => {
        setFormData({
          displayName: res.data.displayName || "",
          kscaId: res.data.kscaId || "",
          dob: res.data.dob ? res.data.dob.split("T")[0] : "",
          fatherName: res.data.fatherName || "",
          motherName: res.data.motherName || "",
          address: res.data.address || "",
          phone: res.data.phone || "",
          parentsPhone: res.data.parentsPhone || "",
          email: res.data.email || "",
          aadharNumber: res.data.aadharNumber || "",
          gender: res.data.gender || "",
          profession: res.data.profession || "",
          batchIds: [],
          schoolOrCollege: res.data.schoolOrCollege || "",
          skillLevel: res.data.skillLevel || "",
          battingStyle: res.data.battingStyle || "",
          bowlingStyle: res.data.bowlingStyle || "",
          previousRepresentation: res.data.previousRepresentation || "",
          joiningDate: res.data.joiningDate
            ? res.data.joiningDate.split("T")[0]
            : "",
          notes: res.data.notes || "",
        });

        // Extract batch IDs from batches array
        if (res.data.batches && Array.isArray(res.data.batches)) {
          setBatchIds(res.data.batches.map((b: any) => b.id));
        }

        if (res.data.photoUrl) {
          setPhotoPreview(res.data.photoUrl);
        }
      })
      .catch(() => {
        toast.error("Failed to load player details");
        navigate(-1);
      });
  }, [playerPublicId, navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (!file) {
      setPhotoPreview("");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    const { errors } = validatePlayerForm(formData, batchIds);

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Add batchIds to the player data
      const playerData = {
        ...formData,
        batchIds: batchIds,
      };

      formDataToSend.append(
        "player",
        new Blob([JSON.stringify(playerData)], {
          type: "application/json",
        }),
      );

      if (photoFile) {
        formDataToSend.append("photo", photoFile);
      }

      await api.put(`/admin/players/${playerPublicId}`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Player updated successfully");
      navigate(`/admin/players/${playerPublicId}/info`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold">Update Player</h1>
          <p className="text-sm text-gray-500">Edit player information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <PlayerForm
          formData={formData}
          onChange={handleChange}
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
          submitLabel="Update Player"
          loading={loading}
          onCancel={() => navigate(-1)}
          batchIds={batchIds}
          onBatchChange={setBatchIds}
        />
      </form>
    </div>
  );
}

export function validatePlayerForm(
  formData: PlayerFormData,
  batchIds: string[],
) {
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
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.push("Invalid email format");
      fieldErrors.email = true;
    }
  }

  if (!formData.parentsPhone?.trim()) {
    errors.push("Parent Phone is required");
    fieldErrors.parentsPhone = true;
  }

  if (batchIds.length === 0) {
    errors.push("At least one batch must be selected");
    fieldErrors.batchIds = true;
  }

  return { errors, fieldErrors };
}

export default UpdatePlayer;
