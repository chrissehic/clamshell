import ClaimLogo from "@/components/ClaimLogo";
import focusvideo from "../../public/videos/FOCUS_ATM.gif";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-dark-purple font-[family-name:var(--font-geist-sans)]">
      <header>
        <nav>
          <div className="flex flex-col p-8 w-full">
            <div className="flex flex-row gap-3 items-center">
              <ClaimLogo width={45} fill="white" />
              <span className="text-white text-2xl">Clamshell</span>
            </div>
          </div>
        </nav>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center justify-items-center pb-20 sm:pb-0 gap-16 sm:px-30 px-4 max-w-[88rem]">
        <div className="relative flex flex-1 flex-col-reverse lg:flex-row items-center justify-start">
          <div className="z-10 flex flex-1 flex-col justify-center lg:items-start items-center text-center lg:text-left lg:max-w-[50%] space-y-6 lg:space-y-8">
            <h1 className="text-white text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tighter tracking-tight">
              AI is stealing your work - take the power back
            </h1>
            <Link href={'/dashboard'}
             className="bg-pink-900 text-xl text-white transition-all ease-in-out duration-200 font-semibold rounded-full h-auto px-8 py-4 cursor-pointer hover:bg-pink-700 w-full lg:w-fit">
              Check AI usage
            </Link>
          </div>
          <div className="flex flex-col justify-center items-center flex-1 relative z-0 w-full max-w-md lg:max-w-none -ml-8">
            <div className="relative aspect-[4/3] w-full">
              {/* SVG Mask Definition */}
              <svg className="absolute inset-0 w-0 h-0">
                <defs>
                  <clipPath id="clam-mask" clipPathUnits="objectBoundingBox">
                    <path d="M0.622,0.038 C0.596,0.014 0.555,0.001 0.497,0.001 C0.439,0.001 0.4,0.014 0.375,0.038 C0.355,0.058 0.347,0.082 0.344,0.107 C0.268,0.096 0.219,0.121 0.191,0.162 C0.166,0.198 0.159,0.244 0.158,0.279 C0.032,0.308 -0.008,0.401 0.001,0.462 L0.002,0.465 C0.029,0.614 0.109,0.747 0.201,0.842 C0.292,0.936 0.397,0.996 0.474,0.996 C0.484,0.997 0.492,0.997 0.5,0.997 C0.508,0.997 0.516,0.997 0.526,0.996 C0.603,0.996 0.708,0.936 0.799,0.842 C0.891,0.747 0.971,0.614 0.998,0.465 C1.009,0.401 0.971,0.308 0.842,0.279 C0.841,0.244 0.834,0.198 0.809,0.162 C0.781,0.121 0.732,0.096 0.656,0.107 C0.653,0.082 0.645,0.058 0.622,0.038 Z" />
                  </clipPath>
                </defs>
              </svg>

              {/* Masked Image Container */}
              <div
                className="w-full h-full relative rounded-lg overflow-hidden"
                style={{ clipPath: "url(#clam-mask)" }}
              >
                <Image
                  src={focusvideo}
                  alt="AI detection visualization"
                  fill
                  className="object-cover object-right"
                  priority
                />

                {/* Overlay gradient for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-purple/100 to-transparent" />
              </div>

              {/* Logo Overlay */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                <ClaimLogo width={200} fill="white" className="opacity-30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
