// const permissions = require("../config/permission");

// const authorize = (requiredPermission) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required.",
//       });
//     }

//     const userPermissions = permissions[req.user.role] || [];

//     if (
//       userPermissions.includes("*") ||
//       userPermissions.includes(requiredPermission)
//     ) {
//       return next();
//     }

//     return res.status(403).json({
//       success: false,
//       message: "Access denied. You do not have permission.",
//     });
//   };
// };

// module.exports = authorize;





const permissions = require("../config/permission");

// authorize("a.b")            -> needs a.b
// authorize("a.b", "c.d")     -> needs ANY of them
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userPermissions = permissions[req.user.role] || [];

    if (
      userPermissions.includes("*") ||
      requiredPermissions.some((p) => userPermissions.includes(p))
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You do not have permission.",
    });
  };
};

module.exports = authorize;
