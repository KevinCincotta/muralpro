import { Matrix, SingularValueDecomposition } from "ml-matrix";

function computeNormalizationMatrix(points) {
  const n = points.length;
  let cx = 0, cy = 0;
  for (const p of points) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;

  let dist = 0;
  for (const p of points) {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    dist += Math.sqrt(dx * dx + dy * dy);
  }
  dist /= n;
  const s = Math.sqrt(2) / dist;

  return new Matrix([
    [s, 0, -s * cx],
    [0, s, -s * cy],
    [0, 0, 1],
  ]);
}

export function getHomography(srcPoints, dstPoints) {
  // Compute normalization transformations
  const T_src = computeNormalizationMatrix(srcPoints);
  const T_dst = computeNormalizationMatrix(dstPoints);

  // Normalize points
  const normSrcPoints = srcPoints.map(p => {
    const p_h = new Matrix([[p[0]], [p[1]], [1]]);
    const p_norm_h = T_src.mmul(p_h);
    return [p_norm_h.get(0, 0), p_norm_h.get(1, 0)];
  });
  const normDstPoints = dstPoints.map(p => {
    const p_h = new Matrix([[p[0]], [p[1]], [1]]);
    const p_norm_h = T_dst.mmul(p_h);
    return [p_norm_h.get(0, 0), p_norm_h.get(1, 0)];
  });

  // Construct A with normalized points
  const [s0, s1, s2, s3] = normSrcPoints;
  const [d0, d1, d2, d3] = normDstPoints;
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
    const H_prime = new Matrix([
      [h[0] / scale, h[1] / scale, h[2] / scale],
      [h[3] / scale, h[4] / scale, h[5] / scale],
      [h[6] / scale, h[7] / scale, h[8] / scale],
    ]);

    // Denormalize: H = T_dst^-1 * H' * T_src
    const T_dst_inv = T_dst.inverse();
    const H = T_dst_inv.mmul(H_prime).mmul(T_src);
    const H_array = H.to2DArray();
    console.log("Computed homography:", H_array);
    return H_array;
  } catch (error) {
    console.error("Homography computation failed:", error);
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
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
