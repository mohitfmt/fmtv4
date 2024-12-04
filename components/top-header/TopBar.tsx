import { ThemeToggle } from "./top-bar/ThemeToggle";
import Headlines from "./top-bar/Headlines";
import LastUpdatedDateTime from "./top-bar/LastUpdatedDateTime";
import NewsletterButton from "./top-bar/NewsletterButton";
import SearchNews from "./top-bar/SearchNews";
import SignInButton from "./top-bar/SignInButton";
import { SocialIcons } from "./top-bar/SocialIcons";

const TopBar = () => {
  return (
    <section className="sticky top-0 z-50 flex bg-stone-800 text-stone-100 justify-between items-center p-2 gap-1">
      
      <LastUpdatedDateTime />
      <span className="hidden md:block border-l-[0.5px] h-6 border-stone-500 mx-1" />
      <Headlines />
      <span className="hidden lg:block border-l-[0.5px] h-6 border-stone-500 mx-1" />
      <div className = "hidden lg:block">  
        <SearchNews />
      </div>
    
      <span className="hidden lg:block border-l-[0.5px] h-6 border-stone-500 mx-1" />
      
      <div className="hidden lg:block">
      <NewsletterButton />
      </div>
    
      <span className="hidden lg:block border-l-[0.5px] h-6 border-stone-500 mx-1" />


      <div className="hidden lg:flex">
        <SocialIcons iconClassName="text-3xl hover:text-accent-yellow" />
      </div>
      <span className="hidden lg:block border-l-[0.5px] h-6 border-stone-500 mx-1" />

      <div className="lg:flex gap-1 hidden">
        <SignInButton  />
        <ThemeToggle />
      </div>

    </section>
  );
};

export default TopBar;



// import { DotsThreeVertical } from "@phosphor-icons/react";
// import { ThemeToggle } from "./top-bar/ThemeToggle";
// import Headlines from "./top-bar/Headlines";
// import LastUpdatedDateTime from "./top-bar/LastUpdatedDateTime";
// import NewsletterButton from "./top-bar/NewsletterButton";
// import SearchNews from "./top-bar/SearchNews";
// import SignInButton from "./top-bar/SignInButton";
// import { SocialIcons } from "./top-bar/SocialIcons";

// const TopBar = () => {
//   const [isMenuOpen, setIsMenuOpen] = useState(false);

//   return (
//     <section className="sticky top-0 z-50 flex bg-stone-800 text-stone-100 justify-between items-center p-2 gap-1">
//       {/* Last Updated and Headlines */}
//       <LastUpdatedDateTime />
//       <Headlines />
//       <span className="hidden lg:block border-l-[0.5px] h-6 border-stone-500 mx-1" />

//       {/* Search News */}
//       <div className="hidden lg:block">
//         <SearchNews />
//       </div>

//       <span className="hidden lg:block border-l-[0.5px] h-6 border-stone-500 mx-1" />

//       {/* More Options Menu */}
//       <div className="relative">
//         <button
//           className="p-2 rounded-full hover:bg-stone-700 transition-colors"
//           aria-label="More options"
//           onClick={() => setIsMenuOpen((prev) => !prev)}
//         >
//           <DotsThreeVertical size={24} />
//         </button>
//         {isMenuOpen && (
//           <div className="absolute right-0 mt-2 bg-stone-900 text-stone-100 rounded-lg shadow-lg p-3 w-48">
//             <ul className="flex flex-col gap-2">
//               {/* Social Media */}
//               <li className="flex flex-col gap-1">
//                 <h4 className="font-semibold text-sm">Follow Us</h4>
//                 <SocialIcons />
//               </li>

//               {/* Newsletter */}
//               <li>
//                 <NewsletterButton />
//               </li>

//               {/* Sign In */}
//               <li>
//                 <SignInButton />
//               </li>

//               {/* Theme Toggle */}
//               <li>
//                 <ThemeToggle />
//               </li>
//             </ul>
//           </div>
//         )}
//       </div>
//     </section>
//   );
// };

// export default TopBar;

