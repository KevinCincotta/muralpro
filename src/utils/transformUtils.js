import { Matrix, SingularValueDecomposition } from "ml-matrix";

export function getHomography(srcPoints, dstPoints) {
  const [s0, s1, s2, s3] = srcPoints;
  const [d0, d1, d2, d3] = dstPoints;

  const A = [
    [-s0[0], -s0[1], -1, 0, 0, 0, s0[0] * d0[0], s0[1] * d0[0], d0[0]],
    [0, 0, 0, -s0[0], -s0[1], -1, s0[0] * d0[1], s0[1] * d0[1], d0[1]],
    [-s1[0], -s1[1], -1, 0, 0, 0, s1[0] * d1[0], s1[1] * d1[0], d1[0]],
    [0, 0, 0, -s1[0], -s1[1], -1, s1[0] * d1[1], s1[1] * d1[1], d1[1]],
    [-s2[0], -s2[1], -1, 0, 0, 0, s2[0] * d2[0], s2[1] * d2[0], d2[0]],
    [0, 0, 0, -s2[0], -s2[1], -1, s2[0] * d2[1], s2[1] * d2[1], d2[1]],
    [-s3[0], -s3[1], -1, 0, 0, 0, s3[0] * d3[0], s3[1] * d3[0], d3[0]],
    [0, 0, 0, -s3[0], -s3[1], -1, s3[0] * d3[1], s3[1] * d3[1], d3[1]],
  ];

  try {
    const matrixA = new Matrix(A);
    const svd = new SingularValueDecomposition(matrixA, { autoTranspose: true });
    const V = svd.rightSingularVectors;
    const h = V.getColumn(V.columns - 1);
    const scale = h[8] !== 0 ? h[8] : 1;
    const H = [
      [h[0] / scale, h[1] / scale, h[2] / scale],
      [h[3] / scale, h[4] / scale, h[5] / scale],
      [h[6] / scale, h[7] / scale, h[8] / scale],
    ];
    console.log("Computed homography:", H);
    return H;
  } catch (error) {
    console.error("Homography computation failed:", error);
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // Fallback to identity
  }
}

export function homographyToTransformMatrix(H) {
  return [H[0][0], H[1][0], H[0][1], H[1][1], H[0][2], H[1][2]];
}

export function transformPoint(point, H) {
  const x = point[0], y = point[1];
  const a = H[0][0], b = H[0][1], c = H[0][2];
  const d = H[1][0], e = H[1][1], f = H[1][2];
  const g = H[2][0], h = H[2][1], i = H[2][2];
  const w = g * x + h * y + i;
  return [(a * x + b * y + c) / w, (d * x + e * y + f) / w];
}