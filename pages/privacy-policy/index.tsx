import Meta from "@/components/common/Meta";
import AdSlot from "@/components/common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

const dfpTargetingParams = {
  pos: "listing",
  section: ["privacy page"],
  key: gerneralTargetingKeys,
};

const PrivacyPolicyPage = () => {
  return (
    <>
      <Meta
        title="Privacy & Policy | Free Malaysia Today (FMT)"
        description="FMT Media Sdn Bhd (FMT) respects the privacy of individuals with regard to personal data and are committed to protecting the privacy of our users, and strive to provide a safe, secure user experience. This privacy policy is formulated in accordance with the Personal Data Protection Act 2010 ('Act')."
        canonical="privacy-policy"
      />

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
      <div className="py-4">
        <h1 className="mt-4 py-2 text-center text-4xl font-extrabold">
          Privacy Policy
        </h1>
        <p className="py-2">
          FMT Media Sdn Bhd (FMT) respects the privacy of individuals with
          regard to personal data and are committed to protecting the privacy of
          our users, and strive to provide a safe, secure user experience. This
          privacy policy is formulated in accordance with the Personal Data
          Protection Act 2010 (“Act”), which describes how your information
          (“Personal Data”) is collected and used and your choices with respect
          to your Personal Data. For absolute clarity, any reference to “we”,
          “our” or “us” in this Privacy Policy shall include any member of FMT.
          The following discloses our information gathering and dissemination
          practices for our website Free Malaysia Today -
          www.freemalaysiatoday.com (“Website”) and if relevant, for the use of,
          or subscription to, or purchase of any products and/or services
          offered by FMT.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          1. Information Collected by Free Malaysia Today
        </h3>
        <p className="py-2">
          Our website servers do not automatically recognize specific
          information about individual users on our websites. In addition, our
          servers do not automatically record information regarding a
          user&apos;s e- mail address unless the user supplies it.
        </p>
        <p className="py-2">
          We collect information about users during the registration process for
          certain parts of our site; through their participation in certain
          activities, including contests, forums, and polls; and through the use
          of cookies. When you request pages from our server, it automatically
          collects some information about your preferences, including your
          internet protocol (“IP”) address. We use this to help diagnose
          problems with our server, and to administer our websites.
        </p>
        <p className="py-2">
          The user-supplied information collected through the registration
          process, surveys, contest entry forms, polls or other similar vehicles
          is used to improve the content of our site, or used for our marketing
          purposes. It is not shared with other organizations for commercial
          purposes unless specifically stated herein.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          2. Purpose of Personal Data Collected
        </h3>
        <p className="py-2">
          Personal Data that you provide to us voluntarily on our websites and
          the other related channels may be processed for the following purposes
          (collectively, “Purposes”):
        </p>
        <ul className="list-disc space-y-1 px-6 py-2">
          <li>to manage, verify and complete transactions with you</li>
          <li>
            to manage and verify your membership for our customer loyalty scheme
            (where applicable)
          </li>
          <li>to direct market our products and/or services to you</li>
          <li>
            to understand and analyse our sales, and your needs and preferences
          </li>
          <li>
            to develop, enhance, market and provide products and services to
            meet your needs
          </li>
          <li>to enable you to participate in promotions and contests</li>
          <li>to process exchanges or product returns</li>
          <li>to improve our services</li>
          <li>to respond to your requests or complaints</li>
          <li>
            to send you updates on products, news and event updates, rewards and
            promotions, special privileges and initiatives offered by FMT and/or
            its partners and/or advertisers
          </li>
          <li>
            to process your payment transactions including without limitation to
            credit control services
          </li>
          <li>
            to comply with any regulatory, statutory or legal obligation imposed
            on us by any relevant authority
          </li>
        </ul>
        <p className="py-2">
          Although the precise details of the Personal Data collected will vary
          according to the specific purpose (such as contests, forums, surveys
          etc.) whether via online or otherwise, we may typically collect the
          following Personal Data from or in relation to you:
        </p>
        <ul className="list-disc space-y-1 px-6 py-2">
          <li>Name</li>
          <li>Address</li>
          <li>Phone number(s)</li>
          <li>Date of birth</li>
          <li>Email address</li>
          <li>Gender</li>
          <li>Identity card number or passport number</li>
        </ul>
        <h3 className="mt-4 text-2xl font-extrabold">3. Use and Disclosure</h3>
        <p className="py-2">
          We may disclose your Personal Data within FMT for the Purposes set
          forth hereinabove in accordance with the terms and conditions set out
          herein.
        </p>
        <p className="py-2">
          We are responsible for the Personal Data under our control, including
          Personal Data disclosed by us to a Vendor (often referred to as the
          data processor). “Vendor” in this Privacy Policy means in relation to
          Personal Data, any person or entity (other than our own employee) who
          processes the Personal Data on behalf of us. “Processing”, in relation
          to Personal Data means for example obtaining, recording, holding or
          using the Personal Data in carrying out any operation or set of
          operations on the Personal Data including organization, compilation,
          retrieval disclosure of the Personal Data for verification purposes.
        </p>
        <p className="py-2">
          We take every measure to provide a comparable level of protection for
          Personal Data should the information be processed by a Vendor.
        </p>
        <p className="py-2">
          We use and disclose aggregated non-personally identifying information
          collected through this Website as part of our organization&apos;s
          process of constantly improving this Website, and the products and
          services offered by FMT.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          4. Impact of Non-Provision of Personal Data
        </h3>
        <p className="py-2">
          Please note that in the event that sufficient Personal Data is not
          supplied, or is not satisfactory to us, then your application or
          request for any of the above Purposes may not be accepted or acted
          upon or your request to browse some information on this Website, or
          the use of, or subscription to, or purchase of any products and/or
          services offered by FMT may be denied or affected.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          5. Storage and Retention of Personal Data
        </h3>
        <p className="py-2">
          Your Personal Data shall be stored either in hard copies in our
          offices or in servers located in Malaysia. It may be necessary to
          transfer your Personal Information to third party services providers
          based/located outside Malaysia. By continuing usage of the Website,
          products and/or services of FMT, you hereby consent to such transfer.
        </p>
        <p className="py-2">
          Any Personal Data supplied by you will be retained by us as long as
          necessary for the fulfilment of the Purposes stated in paragraph (2)
          above or is required to satisfy legal regulatory, accounting
          requirements or to protect our interests.
        </p>
        <p className="py-2">
          Save and except as provided in paragraph (15) hereof, we do not offer
          any online facilities for you to delete your Personal Data held by us.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          6. How email and &apos;Contact Us&apos; Messages are being handeled
        </h3>
        <p className="py-2">
          We may preserve the content of any email or “Contact Us” or other
          electronic message that we receive.
        </p>
        <p className="py-2">
          Any Personal Data contained in those messages will only be used or
          disclosed in ways set out in this Privacy Policy.
        </p>
        <p className="py-2">
          The message content may be monitored by our service providers or
          employees for purposes including but not limited to compliance,
          auditing and maintenance or where email abuse is suspected.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          7. Communication or Utilisation Data
        </h3>
        <p className="py-2">
          Through your use of telecommunications services to access this Website
          and/or any other sites operated and/or managed by FMT, your
          communications data (e.g. IP address) or utilization data (e.g.
          information on the beginning, end and extent of each access, and
          information on the telecommunications services you accessed) are
          technically generated and could conceivably relate to Personal Data.
        </p>
        <p className="py-2">
          To the extent that there is a compelling necessity, the collection,
          processing and use of your communications or utilization data will
          occur and will be performed in accordance with the applicable data
          privacy protection legal framework.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          8. Automatic Collection of Non-Personal Data
        </h3>
        <p className="py-2">
          When you access this Website and/or use of any product/services
          offered by FMT, we may automatically (i.e., not by registration)
          collect non-personal data (e.g. type of Internet browser and operating
          system used, domain name of the website from which you came, number of
          visits, average time spent on the site, pages viewed).
        </p>
        <p className="py-2">
          We may use this non-personal data and share it within FMT to monitor
          the attractiveness of this Website and improve their performance or
          content.
        </p>
        <ul className="list-disc space-y-1 px-6 py-2">
          <li>
            Device information— such as your hardware model, IP address, other
            unique device identifiers, operating system version, browser type
            and settings, such as language and available font settings, and
            settings of the device you use to access our Website.
          </li>
          <li>
            Usage information— such as information about your usage of the
            Website, products and/or services offered by FMT, the time and
            duration of your usage and other information about your interaction
            with content offered by FMT, and any information stored using
            cookies, mobile ad identifiers, and similar technologies that we
            have set on your device. For detailed information about our use of
            cookies, web beacons, and other technologies, see Online Tracking
            and Advertising in paragraph 9 below.
          </li>
          <li>
            Location information— such as your computer&apos;s IP address, your
            mobile device&apos;s global positioning system (GPS) signal or
            information about nearby WiFi access points and cell towers that may
            be transmitted to us when you use certain Services.
          </li>
        </ul>
        <h3 className="mt-4 text-2xl font-extrabold">
          9. Online Tracking and Advertising
        </h3>
        <p className="py-2">
          How We Use Cookies, Web Beacons, and Similar Technologies and How to
          Disable These Technologies
        </p>
        <p className="py-2">
          We and any third parties duly appointed/authorized by us to provide
          content, advertising, or functionality or measure and analyse
          advertisement performance on our Website (collectively, “Authorized
          Third Parties”), may use cookies, web beacons, mobile advertising
          identifiers, and similar technologies to facilitate administration and
          navigation, to better understand and improve our Website, to determine
          and/or improve the advertising shown to you here or within the online
          sites operated and/or managed by FMT, and to provide you with a
          customized online experience.
        </p>
        <ul className="list-disc space-y-1 px-6 py-2">
          <li>
            Cookies. Cookies are small files that are placed on your computer
            when you visit the Website. Cookies may be used to store a unique
            identification number tied to your computer or device so that you
            can be recognized as the same user across one or more browsing
            sessions, and across one or more sites. Cookies serve many useful
            purposes. For example: Cookies can remember your sign-in credentials
            so you do not have to enter those credentials each time you visit a
            Website. Cookies can help us and the Authorized Third Parties
            understand which parts of our Website are the most popular because
            they help us see which pages and features users access and how much
            time they spend on the pages. By studying this kind of information,
            we are better able to adapt our Website and provide you with a
            better experience. Cookies help us and the Authorized Third Parties
            understand which advertisements you have seen so that you don&apos;t
            receive the same advertisement each time you visit our Website. Most
            browsers accept cookies automatically, but can be configured not to
            do so or to notify the user when a cookie is being sent. If you wish
            to disable cookies, refer to your browser help menu to learn how to
            disable cookies. If you disable browser cookies or flash cookies, it
            may interfere with the proper functioning of our Website.
          </li>
          <li>
            Beacons. We, along with the Authorized Third Parties, also may use
            technologies called beacons (or “pixels”) that communicate
            information from your device to a server. Beacons can be embedded in
            online content, videos, and emails, and can allow a server to read
            certain types of information from your device, know when you have
            viewed particular content or a particular email message, determine
            the time and date on which you viewed the beacon, and the IP address
            of your device. We and third parties use beacons for a variety of
            purposes, including to analyze the use of the Website and products
            and/or services offered by FMT and (in conjunction with cookies) to
            provide content and advertisements that are more relevant to
            you.Local Storage & Other Tracking Technologies. We, along with
            third parties, may use other kinds of technologies, such as Local
            Shared Objects (also referred to as “Flash cookies”) and Hypertext
            Markup Language revision 5 (HTML5) local storage, in connection with
            our Website. We also may use unique identifiers associated with your
            device, such as mobile advertising identifiers. These technologies
            are similar to the cookies discussed above in that they are stored
            on your device and can be used to store certain information about
            your activities and preferences. However, these technologies may
            make use of different parts of your device from standard cookies,
            and so you might not be able to control them using standard browser
            tools and settings. For HTML5 local storage, the method for
            disabling HTML5 will vary depending on your browser. For Flash
            cookies, information about disabling or deleting information
            contained in Flash cookies can be found here.
          </li>
          <li>
            Additional Choices With Respect To Targeted Advertising. As
            described above, we and the Authorized Third Parties may use cookies
            and other tracking technologies to facilitate serving relevant
            advertisements to you. Due to differences between using apps and
            websites on mobile devices, you may need to take additional steps to
            disable tracking technologies in mobile applications. Many mobile
            devices allow you to opt-out of targeted advertising for mobile
            applications using the settings within the mobile application or
            your mobile device. For more information, please check your mobile
            settings. You also may uninstall our applications using the standard
            uninstall process available on your mobile device or app
            marketplace.
          </li>
        </ul>
        <h3 className="mt-4 text-2xl font-extrabold">10. Public Forums</h3>
        <p className="py-2">
          This Website makes information sharing, feedback, forums, and/or
          message boards available to its users. Please remember that any
          information that is disclosed in these areas becomes public
          information and you should exercise caution when deciding to disclose
          your Personal Data. We request that users treat each other with
          courtesy and mutual respect.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">11. Job Applicants</h3>
        <p className="py-2">
          Personal Data provided in connection with an application for
          employment will be used to determine your suitability for a position
          with FMT and, if applicable, your terms of employment or engagement.
          Your information may also be used to monitor our recruitment
          initiatives and equal opportunities policies. Your details may be
          disclosed to third parties to verify or obtain additional information
          including education institutions, current/previous employers and
          credit reference agencies. Credit reference agencies record these
          searches and you can contact us to find out which agencies we used.
          Unsuccessful applications may be retained to match your skills to
          future job opportunities.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">12. Confidentiality</h3>
        <p className="py-2">
          Personal Data held by us will be kept confidential in accordance with
          this Privacy Policy pursuant to any applicable law that may from time
          to time be in force.
        </p>
        <p className="py-2">
          Any questions, comments, suggestions or information other than
          Personal Data sent or posted to this Website, or any part of the
          Website by users will be deemed voluntarily provided to us on a
          non-confidential and non-proprietary basis.
        </p>
        <p className="py-2">
          We reserve the right to use, reproduce, disclose, transmit, publish,
          broadcast and/or post elsewhere such information freely without
          further reference to you.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">13. Security</h3>
        <p className="py-2">
          For the internet, unfortunately, no data transmission over the
          internet can be guaranteed as completely secure. While we strive to
          protect such Personal Data, we cannot ensure or warrant the security
          of any Personal Data transmitted to us and individuals do so at their
          own risk. Once any Personal Data comes into our possession, we will
          take reasonable steps to protect that information from misuse and loss
          and from unauthorised access, modification or disclosure.
        </p>
        <p className="py-2">
          A username and password may be essential for you to use some sections
          of this Website. For your own protection, we require you to keep these
          confidential and to change your password regularly (if required).
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">14. Links</h3>
        <p className="py-2">
          This Website contains links to other sites. We are not responsible for
          the privacy practices or the content of such sites. We have
          established relationships with advertisers and/or business partners
          but such relationships are generally technical in nature, or content
          collaborations. If any advertisers and/or business partners access to
          any information entered by users in our database, this fact shall be
          disclosed to the user upon initiating the registration process. Users
          who feel they do not wish their information to be shared by anyone
          other than the Website may then opt out of completing the
          registration.
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          15. Right of Access to Personal Data
        </h3>
        <p className="py-2">
          Under the Act, you have the right of access to your Personal Data held
          by us on payment of a prescribed fee and to request correction of the
          Personal Data that is inaccurate, incomplete, misleading or not
          up-to-date. If you have any questions regarding this Privacy Policy or
          if you wish to request access to your Personal Data or if you wish to
          correct your Personal Data or if you wish to withdraw your consent for
          future marketing communication, you may send your request in writing
          to:
        </p>
        <p className="py-2">Address:</p>
        <p className="py-2">Unit 1330 & 1332, 13th Floor,</p>
        <p className="py-2">Block A, Damansara Intan,</p>
        <p className="py-2">No 1, Jalan SS20/27,</p>
        <p className="py-2">47400 Petaling Jaya,</p>
        <p className="py-2">Selangor, Malaysia.</p>
        <p className="py-2">
          Or email:{" "}
          <a href="mailto:editor@freemalaysiatoday.com">
            editor@freemalaysiatoday.com
          </a>
        </p>
        <h3 className="mt-4 text-2xl font-extrabold">
          16. Changes to Privacy Policy
        </h3>
        <p className="py-2">
          We reserve the right to amend this Privacy Policy from time to time
          without prior notice. Any changes to the Privacy Policy will be
          uploaded onto our Website and therefore, we encourage you to
          check/visit the Website from time to time for any changes on a regular
          basis.
        </p>
        <p className="py-2">(Last updated 4 April 2018)</p>
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
      <AdSlot
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
      />
    </>
  );
};

export default PrivacyPolicyPage;
