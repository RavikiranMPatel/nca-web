import { useEffect, useState } from "react";
import api from "../api/axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

type SliderImage = {
  id: string;
  imageUrl: string;
};

function HomeSlider() {
  const [images, setImages] = useState<SliderImage[]>([]);

  useEffect(() => {
    api.get("/home-slider")
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
        slidesPerView={1}
      >
        {images.map(img => (
          <SwiperSlide key={img.id}>
            <img
              src={img.imageUrl}
              alt="Academy"
              className="w-full h-[420px] object-cover"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default HomeSlider;
