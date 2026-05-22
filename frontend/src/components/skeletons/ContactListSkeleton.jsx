const ContactListSkeleton = ({ count = 5 }) => {
  const skeletonContacts = Array(count).fill(null);

  return (
    <div className="overflow-y-auto w-full space-y-2 py-2">
      {skeletonContacts.map((_, idx) => (
        <div key={idx} className="w-full p-2 flex items-center gap-3 rounded-xl animate-pulse">
          {/* Avatar skeleton */}
          <div className="relative shrink-0">
            <div className="w-[46px] h-[46px] rounded-full bg-base-300/60" />
          </div>

          {/* User info skeleton */}
          <div className="text-left flex-1 min-w-0 py-1 flex flex-col gap-2">
            <div className="h-3 w-32 bg-base-300/60 rounded" />
            <div className="h-2 w-16 bg-base-300/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactListSkeleton;
