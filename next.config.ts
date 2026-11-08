import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images:{
    imageSizes:[16,32,48,64,96,128,256,300,384],
    remotePatterns:[
      {protocol:"https",hostname:"*.ufs.sh",pathname:"/f/**"},
      {protocol:"https",hostname:"utfs.io",pathname:"/f/**"}
    ]
  }
};
export default nextConfig;
