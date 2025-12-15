import Meta from "@/components/common/Meta";
import ContactDetails from "@/components/contact/contact-details";
import AdSlot from "@/components/common/AdSlot";
import ContactUsForm from "@/components/contact/contact-us-form";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

const dfpTargetingParams = {
  pos: "listing",
  section: ["contact us page"],
  key: gerneralTargetingKeys,
};

const embedUrl =
  "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d15935.872567276509!2d101.6416962!3d3.103121!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x4db4e3783bfeaa1e!2sFMT%20MEDIA%20SDN%20BHD!5e0!3m2!1sen!2smy!4v1654827324305!5m2!1sen!2smy";

const ContactUsPage = () => (
  <>
    <Meta
      title="Contact Us | Free Malaysia Today (FMT)"
      description={`Use the form below to get in touch with us. Alternatively, email or call us.
                    Editorial related matters and letters/opinions for publication: 
                    editor@freemalaysiatoday.com. Please note that articles exclusively sent to FMT stand a better chance of publication.
                    Advertising: advertise@freemalaysiatoday.com or +603-7932 0608.
                    Career: career@freemalaysiatoday.com or +603-7932 0608.`}
      canonical="contact-us"
    />

    {/* AdSlot for Desktop */}
    <div className="ads-dynamic-desktop">
      <AdSlot
        sizes={[
          [970, 90],
          [970, 250],
          [728, 90],
        ]}
        targetingParams={dfpTargetingParams}
        id="div-gpt-ad-1661333181124-0"
        name="ROS_Billboard"
        visibleOnDevices="onlyDesktop"
      />
    </div>

    {/* AdSlot for Mobile */}
    <div className="ads-small-mobile">
      <AdSlot
        sizes={[
          [320, 50],
          [320, 100],
        ]}
        targetingParams={dfpTargetingParams}
        id="div-gpt-ad-1661362470988-0"
        name="ROS_Mobile_Leaderboard"
        visibleOnDevices="onlyMobile"
      />
    </div>

    <div className="my-4">
      {/* Page Title */}
      <h1 className="my-10 text-center text-2xl font-extrabold md:text-3xl lg:text-4xl">
        Get In Touch With Us
      </h1>

      {/* Content Section */}
      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Google Maps Embed */}
        <iframe
          height="100%"
          loading="lazy"
          src={embedUrl}
          style={{ border: 0, minHeight: "450px" }}
          width="100%"
        />
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Use the form below to Get in Touch with Us.
          </h2>
          {/* Contact Form and Details */}
          <ContactUsForm />
          <ContactDetails />
        </div>
      </div>

      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      {/* <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      /> */}
    </div>
  </>
);

export default ContactUsPage;
