import Meta from "@/components/common/Meta";
import AdSlot from "@/components/common/AdSlot";

const dfpTargetingParams = {
  pos: "listing",
  section: ["privacy page"],
};

const PrivacyPolicyPage = () => {
  return (
    <>
      <Meta
        title="Privacy & Policy | Free Malaysia Today (FMT)"
        description="FMT Media Sdn Bhd (FMT) respects the privacy of individuals with regard to personal data and are committed to protecting the privacy of our users, and strive to provide a safe, secure user experience. This privacy policy is formulated in accordance with the Personal Data Protection Act 2010 ('Act')."
        canonical="privacy-policy"
      />
      <div className="py-4">
        {/* AdSlot for Desktop */}
        <div className="mb-4 hidden justify-center md:flex">
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
        <div className="mb-4 flex justify-center md:hidden">
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

        {/* Page Title */}
        <h1 className="mt-4 py-2 text-center text-4xl font-extrabold">
          Privacy Policy
        </h1>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <p>
            FMT Media Sdn Bhd (FMT) respects the privacy of individuals with
            regard to personal data and are committed to protecting the privacy
            of our users, and strive to provide a safe, secure user experience.
            This privacy policy is formulated in accordance with the Personal
            Data Protection Act 2010 (“Act”), which describes how your
            information (“Personal Data”) is collected and used and your choices
            with respect to your Personal Data. For absolute clarity, any
            reference to “we”, “our” or “us” in this Privacy Policy shall
            include any member of FMT. The following discloses our information
            gathering and dissemination practices for our website Free Malaysia
            Today - www.freemalaysiatoday.com (“Website”) and if relevant, for
            the use of, or subscription to, or purchase of any products and/or
            services offered by FMT.
          </p>

          {/* Add relevant sections */}
          <section>
            <h3 className="mt-4 text-2xl font-extrabold">
              1. Information Collected by Free Malaysia Today
            </h3>
            <p>
              Our website servers do not automatically recognize specific
              information about individual users on our websites. In addition,
              our servers do not automatically record information regarding a
              user&apos;s e- mail address unless the user supplies it.
            </p>
            <p>
              We collect information about users during the registration process
              for certain parts of our site; through their participation in
              certain activities, including contests, forums, and polls; and
              through the use of cookies. When you request pages from our
              server, it automatically collects some information about your
              preferences, including your internet protocol (“IP”) address. We
              use this to help diagnose problems with our server, and to
              administer our websites.
            </p>
          </section>

          <section>
            <h3 className="mt-4 text-2xl font-extrabold">
              2. Purpose of Personal Data Collected
            </h3>
            <ul className="list-disc px-6 space-y-1">
              <li>To manage, verify and complete transactions with you.</li>
              <li>
                To manage and verify your membership for loyalty programs.
              </li>
              <li>To market our products and/or services to you.</li>
              <li>To understand your needs and preferences.</li>
              <li>To enable you to participate in promotions and contests.</li>
              <li>To process your payment transactions securely.</li>
            </ul>
          </section>

          <section>
            <h3 className="mt-4 text-2xl font-extrabold">
              3. Use and Disclosure
            </h3>
            <p>
              We may disclose your Personal Data within FMT for the purposes set
              forth in this policy. We are responsible for ensuring the security
              of any Personal Data shared with our vendors.
            </p>
          </section>

          {/* Add more sections as necessary */}
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
