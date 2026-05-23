import React from "react";

const Favorites: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Favorites</h1>
      <p className="mt-2 text-muted-foreground">
        Your favorited providers will appear here.
      </p>
    </div>
  );
};

export default Favorites;
