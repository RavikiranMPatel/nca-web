import { useEffect, useState } from "react";
import { Star, Trophy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import publicApi from "../../api/publicApi";
import { getImageUrl } from "../../utils/imageUrl";

type StarPerformerData = {
  heading: string;
  subheading: string;
  name: string;
  achievement: string;
  photoUrl: string;
  primaryColor: string;
};

function StarPerformer() {
  const navigate = useNavigate();
  const [data, setData] = useState<StarPerformerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStarPerformer = async () => {
      try {
        const response = await publicApi.get("/settings/public");
        const settings = response.data;

        setData({
          heading:
            settings.STAR_PERFORMER_HEADING || "Star Performer of the Week",
          subheading:
            settings.STAR_PERFORMER_SUBHEADING ||
            "Celebrating excellence and dedication",
          name: settings.STAR_PERFORMER_NAME || "",
          achievement: settings.STAR_PERFORMER_ACHIEVEMENT || "",
          photoUrl: settings.STAR_PERFORMER_PHOTO_URL || "",
          primaryColor: settings.PRIMARY_COLOR || "#2563eb",
        });
      } catch (error) {
        console.error("Error loading star performer:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStarPerformer();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          No Star Performer Data
        </h1>
        <p className="text-gray-600">
          The star performer section has not been configured yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/home")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${data.primaryColor}15` }}
            >
              <Star
                size={32}
                className="fill-current"
                style={{ color: data.primaryColor }}
              />
            </div>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: data.primaryColor }}
          >
            {data.heading}
          </h1>
          <p className="text-xl text-gray-600">{data.subheading}</p>
        </div>

        {/* Star Performer Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div
            className="h-3"
            style={{ backgroundColor: data.primaryColor }}
          ></div>

          <div className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Photo */}
              <div className="flex justify-center">
                {data.photoUrl ? (
                  <div className="relative">
                    <img
                      src={getImageUrl(data.photoUrl)}
                      alt={data.name}
                      className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-2xl shadow-lg"
                    />
                    <div
                      className="absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: data.primaryColor }}
                    >
                      <Trophy size={32} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-64 h-64 md:w-80 md:h-80 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${data.primaryColor}15` }}
                  >
                    <Star size={80} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <div className="mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                    {data.name || "Name not set"}
                  </h2>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        className="fill-current"
                        style={{ color: data.primaryColor }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3
                    className="font-semibold mb-3 flex items-center gap-2"
                    style={{ color: data.primaryColor }}
                  >
                    <Trophy size={20} />
                    Achievement
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {data.achievement || "Achievement description not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Accent */}
          <div
            className="h-2"
            style={{
              background: `linear-gradient(90deg, ${data.primaryColor} 0%, ${data.primaryColor}80 100%)`,
            }}
          ></div>
        </div>

        {/* Additional Message */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 italic">
            "Excellence is not a skill, it's an attitude"
          </p>
        </div>
      </div>
    </div>
  );
}

export default StarPerformer;
