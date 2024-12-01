
const CopyrightSection: React.FC = () => (
    <div className="mt-8 text-center space-y-2 text-xs text-gray-400">
        <p className="max-w-2xl mx-auto">
            Registration on or use of this site constitutes acceptance of our
            Terms of Service, Privacy Policy and Cookies Policy.
        </p>
        <p>
            Copyright &copy; 2009 - {new Date().getFullYear()} FMT Media Sdn Bhd
            (1235453-U) All Rights Reserved. A part of Media Prima Group.
        </p>
    </div>
);

export default CopyrightSection;