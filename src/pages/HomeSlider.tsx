import { useEffect, useState } from "react";
import publicApi from "../api/publicApi";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

type SliderImage = {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
};

function HomeSlider() {
  const [images, setImages] = useState<SliderImage[]>([]);

  useEffect(() => {
    const academyPublicId = localStorage.getItem("academyPublicId");
    if (!academyPublicId) return;
    publicApi.get(`/home-slider?academyPublicId=${academyPublicId}`)
      .then(res => setImages(res.data))
      .catch(() => setImages([]));
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden shadow">
      <Swiper
        modules={[Autoplay]}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        loop
      >
        {images.map(img => (
          <SwiperSlide key={img.id}>
            <img
              src={img.imageUrl}
              alt="Academy Slide"
              className="w-full h-[220px] sm:h-[300px] md:h-[400px] object-cover"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default HomeSlider;
