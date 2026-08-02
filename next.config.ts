module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://13.60.105.127:5000/:path*",
      },
    ];
  },
};