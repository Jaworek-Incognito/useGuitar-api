const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors/index");
const Product = require("../models/Product");
const { createCloudinaryImage } = require("../utils/createCloudinaryImage");
const cloudinary = require("cloudinary").v2;

const createProduct = async (req, res) => {
  let result = {};
  for (const key in req.body) {
    if (req.body[key] !== null && req.body[key] !== "") {
      result[key] = req.body[key];
    }
  }
  result.user = req.user.userId;
  const product = await Product.create(result);
  if (!product) {
    throw new CustomError.BadRequestError("Please provide all required values");
  }
  if (!req.files) {
    return res.status(StatusCodes.CREATED).json({ product });
  }
  const maxSize = 1024 * 1024 * 2; //2Mb
  let productImages = [];
  if (req.files.length > 1) {
    for (const image of req.files) {
      if (!image.mimetype.startsWith("image")) {
        throw new CustomError.BadRequestError("Please upload image");
      }
      if (image.size > maxSize) {
        throw new CustomError.BadRequestError(
          "Please upload image smaller than 2Mb"
        );
      }
      const imageResult = await createCloudinaryImage(image.buffer);

      productImages = [
        ...productImages,
        { imageId: imageResult.public_id, imageURL: imageResult.secure_url },
      ];
    }
  } else if (req.files.length === 1) {
    if (!req.files[0].mimetype.startsWith("image")) {
      throw new CustomError.BadRequestError("Please upload image");
    }
    if (req.files[0].size > maxSize) {
      throw new CustomError.BadRequestError(
        "Please upload image smaller than 2Mb"
      );
    }
    const imageResult = await createCloudinaryImage(req.files[0].buffer);

    productImages = {
      imageId: imageResult.public_id,
      imageURL: imageResult.secure_url,
    };
  }
  product.images = productImages;
  await product.save();

  res.status(StatusCodes.CREATED).json({ product });
};

const getAllProducts = async (req, res) => {
  const { sortBy, name } = req.query;
  const queryObject = {};
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }

  let result = Product.find(queryObject).select(
    "-description -updatedAt  -user"
  );

  if (sortBy) {
    result = result.sort(sortBy);
  } else {
    result = result.sort("createdAt");
  }
  const products = await result;
  res.status(StatusCodes.OK).json({ products });
};

const getSpecificProducts = async (req, res) => {
  const { category } = req.params;

  let queryEntries = Object.entries(req.query);

  let queryArray = [];
  let queryFilters = [];

  queryEntries.map((arrayEl) => {
    if (arrayEl[0].includes("min") || arrayEl[0].includes("max")) {
      queryFilters = [...queryFilters, [arrayEl[0], arrayEl[1]]];
    } else {
      queryArray = [...queryArray, [arrayEl[0], arrayEl[1]]];
    }
  });

  let queryFiltersArray = [];
  queryFilters.map((arrayEl) => {
    const value = arrayEl[1];
    let items = [];
    if (arrayEl[0].includes("-")) {
      items = arrayEl[0].split("-");
    }
    const [operator, field] = items;

    queryFiltersArray = [...queryFiltersArray, [operator, field, value]];
  });

  let filtersObject = {};

  queryFiltersArray.map((arrayEl) => {
    let isFirtsTimeField = true;
    let [operator, field, value] = arrayEl;
    if (operator === "max") {
      operator = "$lte";
    } else if (operator === "min") {
      operator = "$gte";
    }
    const keys = Object.keys(filtersObject);
    let objectEl;
    keys.map((key) => {
      if (key === field) {
        filtersObject[key] = {
          ...filtersObject[key],
          [operator]: Number(value),
        };
        isFirtsTimeField = false;
      }
    });
    if (keys.length === 0 || isFirtsTimeField) {
      objectEl = {
        [field]: {
          [operator]: Number(value),
        },
      };
      filtersObject = { ...filtersObject, ...objectEl };
    }
  });

  const queryObjectFromArray = Object.fromEntries(queryArray);

  let queryObject = { ...queryObjectFromArray, ...filtersObject, category };

  if (queryObject.name) {
    queryObject.name = { $regex: queryObject.name, $options: "i" };
  }

  let result = Product.find(queryObject).select(
    "-description -updatedAt  -user"
  );

  if (queryObject.sortBy) {
    result = result.sort(queryObject.sortBy);
  } else {
    result = result.sort("createdAt");
  }
  const products = await result;
  res.status(StatusCodes.OK).json({ products });
};

const getSingleProduct = async (req, res) => {
  let { name } = req.params;
  // name = name.replaceAll("_", " ");
  const product = await Product.findOne({ name }).populate({
    path: "reviews",
    select: "comment user rating",
  });
  if (!product) {
    throw new CustomError.NotFoundError(`No product with name: ${name}`);
  }

  res.status(StatusCodes.OK).json({ product });
};

const updateProduct = async (req, res) => {
  const { name } = req.params;
  let result = {};
  for (const key in req.body) {
    if (req.body[key] !== null && req.body[key] !== "") {
      result[key] = req.body[key];
    }
  }
  // name = name.replaceAll("_", " ");
  let product = await Product.findOne({ name });
  product = Object.assign(product, result);
  if (!product) {
    throw new CustomError.NotFoundError(`No product with name: ${result}`);
  }
  if (!req.files) {
    await product.save();
    return res.status(StatusCodes.OK).json({ product });
  }
  const maxSize = 1024 * 1024 * 2; //2Mb
  let productImages = [];
  if (req.files) {
    productImages = product.images ? product.images : [];
    if (req.files.length > 1) {
      for (const image of req.files) {
        if (!image.mimetype.startsWith("image")) {
          throw new CustomError.BadRequestError("Please upload image");
        }
        if (image.size > maxSize) {
          throw new CustomError.BadRequestError(
            "Please upload image smaller than 2Mb"
          );
        }
        const imageResult = await createCloudinaryImage(image.buffer);

        productImages = [
          ...productImages,
          { imageId: imageResult.public_id, imageURL: imageResult.secure_url },
        ];
      }
    } else if (req.files.length === 1) {
      if (!req.files[0].mimetype.startsWith("image")) {
        throw new CustomError.BadRequestError("Please upload image");
      }
      if (req.files[0].size > maxSize) {
        throw new CustomError.BadRequestError(
          "Please upload image smaller than 2Mb"
        );
      }
      const imageResult = await createCloudinaryImage(req.files[0].buffer);

      productImages = [
        ...productImages,
        { imageId: imageResult.public_id, imageURL: imageResult.secure_url },
      ];
    }
  }
  product.images = productImages;
  await product.save();
  res.status(StatusCodes.OK).json({ product });
};

const deleteProduct = async (req, res) => {
  let { name } = req.params;
  name = name.replaceAll("_", " ");
  const product = await Product.findOneAndDelete({ name });
  if (!product) {
    throw new CustomError.NotFoundError(`No product with name: ${name}`);
  }

  if (product.images) {
    for (const image of product.images) {
      await cloudinary.uploader.destroy(image.imageId);
    }
  }

  res.status(StatusCodes.OK).json({ product });
};

const deleteProductImage = async (req, res) => {
  const { name } = req.params;
  const { publicId } = req.query;
  if (!publicId) {
    throw new CustomError.BadRequestError("Please provide required query");
  }
  const product = await Product.findOne({ name });
  if (!product) {
    throw new CustomError.NotFoundError(
      `No image with publicId: ${publicId} related to product: ${name}`
    );
  }
  let imageIndex;
  for (const [index, image] of product.images.entries()) {
    if (image.imageId === publicId) imageIndex = index;
  }
  if (imageIndex === -1 || imageIndex === undefined) {
    throw new CustomError.NotFoundError(
      `No image with publicId: ${publicId} related to product: ${name}`
    );
  }
  product.images.splice(imageIndex, 1);
  await product.save();

  await cloudinary.uploader.destroy(publicId);

  res.status(StatusCodes.OK).json({ product });
};

module.exports = {
  createProduct,
  getAllProducts,
  getSpecificProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
};
