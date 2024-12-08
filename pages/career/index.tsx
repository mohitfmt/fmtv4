import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import AdSlot from "@/components/common/AdSlot";

export const metadata: Metadata = {
  title: "Career | Free Malaysia Today (FMT)",
};

const dfpTargetingParams = {
  pos: "listing",
  section: ["career page"],
};

// Define job listings data
const jobListings = [
  {
    id: 1,
    title: "Sub-Editor (Wires)",
    description:
      "FMT is looking for dynamic and result-oriented candidates for sub-editor positions in its Wires team. Candidates must have the following attributes:",
    requirements: [
      "Meticulous",
      "Fluent in English",
      "Capable of editing copy according to the house style",
      "Able to work efficiently under pressure",
      "Able to multi-task",
      "Possess good/sharp news sense",
      "Tech - savvy",
    ],
    additionalInfo: [
      "Those with relevant work experience in the media industry are encouraged to apply.",
      "Shortlisted candidates will be called for an interview.",
    ],
    postedDate: "16 June 2022",
  },
  {
    id: 2,
    title: "Broadcast Journalist / Presenter",
    description:
      "Free Malaysia Today, the leading English language news website in Malaysia is hiring TV journalists. Think you have the face, wit, voice and confidence to give it a go? We are looking for people with:",
    requirements: [
      "A nose for the news with a keen interest in current affairs including politics and the economy",
      "Preferably with 1-2 years of relevant working experience. Fresh graduates with a strong desire to learn are also encouraged to apply.",
      "Good written and spoken English",
    ],
    additionalInfo: ["Shortlisted candidates will be called for an interview."],
    postedDate: "11 June 2022",
  },
  {
    id: 3,
    title: "Reporter",
    description:
      "We are looking for reporters to join our small but highly productive business unit. Interested candidate must have the following:-",
    requirements: [
      "Preferably with 1-2 years of relevant working experience. Fresh graduates with a strong desire to learn are also encouraged to apply.",
      "Good written and spoken English. Well versed in current affairs including politics and economy.",
    ],
    additionalInfo: ["Shortlisted candidates will be called for an interview."],
    postedDate: "16 June 2022",
  },
];

const CareerPage = () => {
  const email = "career@freemalaysiatoday.com";

  const renderJobListing = (job: (typeof jobListings)[0]) => (
    <div key={job.id} className="rounded-lg border border-gray-100 p-8">
      <h2 className="text-2xl font-extrabold">{job.title}</h2>
      <p className="py-2">{job.description}</p>

      <ul className="list-disc space-y-1 px-6 py-4">
        {job.requirements.map((requirement, index) => (
          <li key={index}>{requirement}</li>
        ))}
      </ul>

      {job.additionalInfo.map((info, index) => (
        <p key={index} className="py-2">
          {info}
        </p>
      ))}

      <p className="py-2">
        Apply: Send us your CV at{" "}
        <a href={`mailto:${email}`} className="text-blue-500 hover:underline">
          {email}
        </a>
      </p>

      <a href={`mailto:${email}`}>
        <Button variant="outline" className="border-stone-400">
          Apply Now
        </Button>
      </a>

      <p className="pt-4 text-sm text-gray-800 dark:text-gray-300">
        Posted on {job.postedDate}
      </p>
    </div>
  );

  return (
    <div className="p-4">
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


      <h1 className="mt-4 py-2 text-center text-4xl font-extrabold">
        FMT is Hiring
      </h1>

      <div className="mt-8 space-y-4">
        {jobListings.map((job) => renderJobListing(job))}
      </div>
    </div>
  );
};

export default CareerPage;
