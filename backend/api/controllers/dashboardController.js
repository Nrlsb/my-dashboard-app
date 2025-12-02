const dashboardService = require('../services/dashboardService');
const catchAsync = require('../utils/catchAsync');

exports.getDashboardPanelsController = catchAsync(async (req, res) => {
    console.log('GET /api/dashboard-panels -> Consultando paneles visibles...');
    const panels = await dashboardService.getDashboardPanels(req.user);
    res.json(panels);
});

exports.getAdminDashboardPanelsController = catchAsync(async (req, res) => {
    console.log(
        'GET /api/admin/dashboard-panels -> Admin consultando todos los paneles...'
    );
    const panels = await dashboardService.getAdminDashboardPanels();
    res.json(panels);
});

exports.updateDashboardPanelController = catchAsync(async (req, res) => {
    const panelId = req.params.id;
    const { is_visible } = req.body;
    console.log(
        `PUT /api/admin/dashboard-panels/${panelId} -> Admin actualizando visibilidad...`
    );

    if (typeof is_visible !== 'boolean') {
        return res
            .status(400)
            .json({
                message:
                    'El campo is_visible es obligatorio y debe ser un booleano.',
            });
    }
    const result = await dashboardService.updateDashboardPanel(
        panelId,
        is_visible
    );
    res.json(result);
});
