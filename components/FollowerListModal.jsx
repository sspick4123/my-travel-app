import React from "react";
import Link from "next/link";

const FollowerListModal = ({ isOpen, onClose, title, list }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-80 max-h-[80vh] overflow-y-auto rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {list.length > 0 ? (
          <ul className="space-y-2">
            {list.map((user) => (
              <li key={user.uid}>
                <Link href={`/user/${user.uid}`}>
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                    <img
                      src={user.profileImageUrl || "https://via.placeholder.com/50"}
                      alt="profile"
                      className="w-10 h-10 rounded-full"
                    />
                    <span>{user.displayName || "No Name"}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">목록이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default FollowerListModal;
