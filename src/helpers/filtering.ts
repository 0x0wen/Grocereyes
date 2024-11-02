type Categories = {
  [key: string]: string[];
};

export class KMeansShoppingAssistant {
  private readonly categoryMapping: Categories;
  private readonly FOCUS_AREA_THRESHOLD: number;
  private readonly CONFIDENCE_THRESHOLD: number;
  private readonly frameWidth: number;
  private readonly frameHeight: number;

  constructor(frameWidth: number, frameHeight: number) {
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.FOCUS_AREA_THRESHOLD = 0.3;
    this.CONFIDENCE_THRESHOLD = 0.7;

    this.categoryMapping = {
      sayuran: [
        "daun_salam",
        "paprika",
        "kubis",
        "wortel",
        "kembang_kol",
        "mentimun",
        "terong",
        "cabai_hijau",
        "daun_bawang",
        "okra",
        "bawang_merah",
        "bawang_putih",
        "kentang",
        "labu",
        "lobak",
        "cabai_kecil",
        "tomat",
      ],
      daging: ["daging_sapi", "ayam", "daging_kambing", "daging_babi"],
      seafood: ["ikan", "udang"],
      bumbu: ["ketumbar", "jahe", "kunyit", "garam"],
      protein: ["tahu", "kacang_arab", "telur"],
      buah: ["jeruk_kumquat", "lemon"],
    };
  }

  private calculateArea(box: number[]): number {
    const width = Math.abs(box[2] - box[0]);
    const height = Math.abs(box[3] - box[1]);
    return width * height;
  }

  private getBoxCenter(box: number[]): [number, number] {
    const centerX = (box[0] + box[2]) / 2;
    const centerY = (box[1] + box[3]) / 2;
    return [centerX, centerY];
  }

  private prepareFeatures(boxes: number[][], scores: number[]): number[][] {
    return boxes.map((box, index) => {
      const [centerX, centerY] = this.getBoxCenter(box);
      const width = Math.abs(box[2] - box[0]);
      const height = Math.abs(box[3] - box[1]);

      // Normalize features
      return [
        (centerX / this.frameWidth) * 1.5, // Weighted position X
        (centerY / this.frameHeight) * 1.5, // Weighted position Y
        (width / this.frameWidth) * 2.0, // Weighted width
        (height / this.frameHeight) * 2.0, // Weighted height
        scores[index], // Confidence score
      ];
    });
  }

  private kMeans(
    features: number[][],
    k: number,
    maxIterations: number = 100
  ): number[] {
    // Simple k-means implementation
    const n = features.length;
    const dim = features[0].length;

    // Randomly initialize centroids
    const centroids: number[][] = Array.from({ length: k }, () => {
      return Array.from({ length: dim }, () => Math.random());
    });

    let labels: number[] = new Array(n).fill(0);
    let iterations = 0;
    let changed = true;

    while (changed && iterations < maxIterations) {
      changed = false;

      // Assign points to nearest centroid
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let minLabel = 0;

        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(features[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            minLabel = j;
          }
        }

        if (labels[i] !== minLabel) {
          labels[i] = minLabel;
          changed = true;
        }
      }

      // Update centroids
      const newCentroids: number[][] = Array.from({ length: k }, () =>
        new Array(dim).fill(0)
      );
      const counts: number[] = new Array(k).fill(0);

      for (let i = 0; i < n; i++) {
        const label = labels[i];
        counts[label]++;
        for (let d = 0; d < dim; d++) {
          newCentroids[label][d] += features[i][d];
        }
      }

      for (let j = 0; j < k; j++) {
        if (counts[j] > 0) {
          for (let d = 0; d < dim; d++) {
            centroids[j][d] = newCentroids[j][d] / counts[j];
          }
        }
      }

      iterations++;
    }

    return labels;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }

  private determineOptimalK(features: number[][]): number {
    if (features.length < 2) return 1;

    const maxK = Math.min(features.length, 5);
    const inertias: number[] = [];

    for (let k = 1; k <= maxK; k++) {
      const labels = this.kMeans(features, k);
      const inertia = this.calculateInertia(features, labels, k);
      inertias.push(inertia);
    }

    // Simple elbow method
    if (inertias.length > 1) {
      const diffs = inertias.slice(1).map((val, i) => val - inertias[i]);
      if (
        diffs.length > 1 &&
        Math.abs(diffs[0] - diffs[1]) < 0.5 * Math.abs(diffs[0])
      ) {
        return 2;
      }
    }

    return 1;
  }

  private calculateInertia(
    features: number[][],
    labels: number[],
    k: number
  ): number {
    const centroids: number[][] = Array.from({ length: k }, () =>
      new Array(features[0].length).fill(0)
    );
    const counts: number[] = new Array(k).fill(0);

    // Calculate centroids
    for (let i = 0; i < features.length; i++) {
      const label = labels[i];
      counts[label]++;
      for (let d = 0; d < features[0].length; d++) {
        centroids[label][d] += features[i][d];
      }
    }

    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        for (let d = 0; d < features[0].length; d++) {
          centroids[j][d] /= counts[j];
        }
      }
    }

    // Calculate inertia
    let inertia = 0;
    for (let i = 0; i < features.length; i++) {
      inertia += this.euclideanDistance(features[i], centroids[labels[i]]);
    }

    return inertia;
  }

  private getCategory(itemName: string): string {
    for (const [category, items] of Object.entries(this.categoryMapping)) {
      if (items.includes(itemName)) {
        return category;
      }
    }
    return "lainnya";
  }

  public analyzeFrame(
    boxes: number[][],
    classes: string[],
    scores: number[]
  ): {
    messageType: string;
    content: string;
  } {
    if (boxes.length === 0) {
      return {
        messageType: "no_detection",
        content: "Tidak ada objek yang terdeteksi",
      };
    }
    // only allow tomat, kubis, wortel, dan kentang

    // Prepare features for clustering
    const features = this.prepareFeatures(boxes, scores);

    // Determine optimal number of clusters
    const k = this.determineOptimalK(features);

    // Perform clustering
    const clusterLabels = this.kMeans(features, k);

    // Analyze clusters
    const clusterItems: Map<
      number,
      Array<{
        box: number[];
        class: string;
        score: number;
      }>
    > = new Map();

    const clusterScores: Map<number, number> = new Map();

    for (let i = 0; i < boxes.length; i++) {
      const label = clusterLabels[i];
      const area =
        this.calculateArea(boxes[i]) / (this.frameWidth * this.frameHeight);
      const score = area * scores[i];

      if (!clusterItems.has(label)) {
        clusterItems.set(label, []);
        clusterScores.set(label, 0);
      }

      clusterItems.get(label)!.push({
        box: boxes[i],
        class: classes[i],
        score: scores[i],
      });
      clusterScores.set(label, clusterScores.get(label)! + score);
    }

    // Find dominant cluster
    let dominantCluster: number | null = null;
    let maxScore = 0;

    clusterScores.forEach((score, label) => {
      if (score > maxScore) {
        maxScore = score;
        dominantCluster = label;
      }
    });

    // If we have a dominant cluster
    if (dominantCluster !== null && maxScore > this.FOCUS_AREA_THRESHOLD) {
      const dominantItems = clusterItems.get(dominantCluster)!;
      const classes = dominantItems.map((item) => item.class);

      // If all items in dominant cluster are the same
      if (new Set(classes).size === 1) {
        return {
          messageType: "single_focus",
          content: classes[0],
        };
      }
    }

    // If no dominant cluster or multiple types in dominant cluster
    // Group by category
    const categorySet = new Set<string>();
    for (let i = 0; i < classes.length; i++) {
      if (scores[i] > this.CONFIDENCE_THRESHOLD) {
        categorySet.add(this.getCategory(classes[i]));
      }
    }

    return {
      messageType: "category_summary",
      content: Array.from(categorySet).join(", "),
    };
  }

  public generateVoiceMessage(
    messageType: string,
    content: string,
    classes: string[]
  ): string {
    switch (messageType) {
      case "no_detection":
        return "Silakan arahkan kamera ke bahan makanan";
      case "single_focus":
        if (classes.includes("tomat")) {
          return "Terlihat tomat di depan Anda";
        }
        if (classes.includes("kubis")) {
          return "Terlihat kubis di depan Anda";
        }
        if (classes.includes("wortel")) {
          return "Terlihat wortel di depan Anda";
        }
        if (classes.includes("kentang")) {
          return "Terlihat kentang di depan Anda";
        }
        return `Terlihat ${content} di depan Anda`;
      case "multiple_same":
        content = "sayuran";
        return `Terlihat ${content}`;
      case "category_summary":
        return `Terlihat beberapa jenis bahan makanan: ${content}`;
      default:
        return "Maaf, terjadi kesalahan";
    }
  }

  public processFrame(
    boxes: number[][],
    classes: string[],
    scores: number[]
  ): string {
    const { messageType, content } = this.analyzeFrame(boxes, classes, scores);
    return this.generateVoiceMessage(messageType, content, classes);
  }
}

// Contoh penggunaan:
// const assistant = new KMeansShoppingAssistant(640, 480); // frame width & height
// const result = assistant.processFrame(
//     [[100, 100, 200, 200], [300, 300, 400, 400]], // boxes
//     ['tomat', 'wortel'],                           // classes
//     [0.9, 0.8]                                     // scores
// );
