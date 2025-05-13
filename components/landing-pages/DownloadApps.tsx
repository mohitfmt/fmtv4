import Image from "next/image";
import Link from "next/link";
import SectionHeading from "../common/SectionHeading";

const DownloadApp = () => {
  return (
    <section>
      {/* <div className="mb-4 flex items-center gap-2 text-2xl font-extrabold text-foreground">
        <h2>Download our Apps</h2>
      </div> */}
      <SectionHeading sectionName="Download our Apps"/>

      <div className="relative flex gap-2 rounded-lg bg-stone-100 dark:bg-stone-500 dark:text-white p-4">
        <div>
          <h3 className="text-center font-heading text-lg font-bold">
            Stay up to date with FMT News anywhere
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative h-12 w-1/2 transition-transform hover:scale-95">
              <Link
                href="https://play.google.com/store/apps/details?id=com.freemalaysiatoday.fmt"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/playstore.png"
                  alt="Download on Google Play"
                  width={140}
                  height={48}
                  className="mt-4 h-auto w-full"
                  priority
                />
              </Link>
            </div>
            <div className="relative h-12 w-1/2 transition-transform hover:scale-95">
              <Link
                href="https://apps.apple.com/my/app/free-malaysia-today/id1299195853"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/appstore.png"
                  alt="Download on App Store"
                  width={140}
                  height={48}
                  className="mt-4 h-auto w-full"
                  priority
                />
              </Link>
            </div>
          </div>
        </div>

        <Image
          src="/devices.png"
          alt="Mobile devices"
          width={100}
          height={60}
          className="mt-4"
          priority
        />
      </div>
    </section>
  );
};

export default DownloadApp;
