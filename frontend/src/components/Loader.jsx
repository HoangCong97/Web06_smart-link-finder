import React from 'react';

const Loader = ({ message = "AI is embedding text..." }) => {
  return (
    <div className="loader-container">
      <div className="loader-spinner">
        <div className="spinner-outer"></div>
        <div className="spinner-inner"></div>
        <div className="spinner-center"></div>
      </div>
      <p className="loader-message">{message}</p>
    </div>
  );
};

export default Loader;
